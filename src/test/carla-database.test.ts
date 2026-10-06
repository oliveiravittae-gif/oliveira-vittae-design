import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { validCPF } from "@/lib/carla";

const admin = "00000000-0000-4000-8000-000000000001";
const rep = "00000000-0000-4000-8000-000000000002";
const other = "00000000-0000-4000-8000-000000000003";
let db: PGlite;
async function asUser(id: string | null, sql: string, params: unknown[] = []) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? ""]);
  await db.exec(`set role ${id ? "authenticated" : "anon"}`);
  try {
    return await db.query<Record<string, unknown>>(sql, params);
  } finally {
    await db.exec("reset role");
  }
}
let client: string;
let opportunity: string;
let cycle: string;
describe("CARLA database: real Postgres SQL with synthetic Auth/Storage schemas", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon; create role authenticated;
      alter default privileges grant execute on functions to anon,authenticated;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,storage to anon,authenticated;
      grant execute on function auth.uid() to anon,authenticated;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      grant select,insert,delete on storage.objects to authenticated;
      create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;
    `);
    for (const migration of readdirSync("supabase/migrations")
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      await db.exec(readFileSync(`supabase/migrations/${migration}`, "utf8"));
    }
    await db.query("insert into auth.users(id) values($1)", [admin]);
    await db.query("insert into carla_private.admins(user_id) values($1)", [admin]);
    for (const [id, document, registration] of [
      [rep, "52998224725", "TEST-01"],
      [other, "11144477735", "TEST-02"],
    ]) {
      await db.query("insert into auth.users(id,raw_user_meta_data) values($1,$2::jsonb)", [
        id,
        JSON.stringify({
          carla_signup: "true",
          name: "Representante Sintético",
          registration,
          document,
          address: "Endereço fictício para teste, cidade, UF",
          phone: "21999999999",
          status: "active",
          role: "admin",
        }),
      ]);
    }
  }, 30000);
  afterAll(async () => {
    await db?.close();
  });
  it("allocates consecutive registrations centrally and ignores supplied metadata", async () => {
    expect((await asUser(rep, "select registration from public.carla_profiles")).rows).toEqual([
      { registration: "CLR-2026-0001005" },
    ]);
    expect((await asUser(other, "select registration from public.carla_profiles")).rows).toEqual([
      { registration: "CLR-2026-0001006" },
    ]);
    await expect(
      asUser(rep, "select nextval('carla_private.registration_2026')"),
    ).rejects.toThrow();
    await expect(
      asUser(null, "select nextval('carla_private.registration_2026')"),
    ).rejects.toThrow();
  });
  it("validates CPF and rejects repeated or incorrect digits", async () => {
    expect(validCPF("529.982.247-25")).toBe(true);
    expect(validCPF("11111111111")).toBe(false);
    expect(validCPF("52998224724")).toBe(false);
    await expect(
      db.query(
        "insert into auth.users(id,raw_user_meta_data) values(gen_random_uuid(),$1::jsonb)",
        [
          JSON.stringify({
            carla_signup: "true",
            name: "Nome Sintético",
            registration: "BAD",
            document: "11111111111",
            address: "Endereço fictício completo",
            phone: "21999999999",
          }),
        ],
      ),
    ).rejects.toThrow();
  });
  it("ignores self assigned admin/active metadata and prevents cross-profile reads", async () => {
    const r = await asUser(rep, "select status from public.carla_profiles");
    expect(r.rows).toEqual([{ status: "pending" }]);
    expect((await asUser(rep, "select public.carla_is_admin() as admin")).rows).toEqual([
      { admin: false },
    ]);
    await expect(
      asUser(rep, "update public.carla_profiles set status='active' where id=$1", [rep]),
    ).rejects.toThrow();
    await expect(
      asUser(
        rep,
        "select public.carla_review_profile($1,'active','Tentativa inválida de autopromoção')",
        [rep],
      ),
    ).rejects.toThrow();
  });
  it("requires private owner photo before approval and blocks cross-folder uploads", async () => {
    await expect(
      asUser(
        admin,
        "select public.carla_review_profile($1,'active','Cadastro conferido com vínculo formalizado')",
        [rep],
      ),
    ).rejects.toThrow("Foto obrigatória");
    await expect(
      asUser(rep, "insert into storage.objects(bucket_id,name) values('carla-photos',$1)", [
        `${other}/fake.png`,
      ]),
    ).rejects.toThrow();
    for (const id of [rep, other]) {
      await asUser(id, "insert into storage.objects(bucket_id,name) values('carla-photos',$1)", [
        `${id}/test.png`,
      ]);
      await asUser(id, "update public.carla_profiles set photo_path=$1 where id=$2", [
        `${id}/test.png`,
        id,
      ]);
      await asUser(
        admin,
        "select public.carla_review_profile($1,'active','Cadastro e vínculo formalizado conferidos')",
        [id],
      );
    }
    expect((await asUser(other, "select name from storage.objects")).rows).toHaveLength(1);
  });
  it("creates pending opportunities; only admin confirms protection and clients", async () => {
    const r = await asUser(
      rep,
      "insert into public.carla_opportunities(representative_id,company,contact,channel,evidence) values($1,'Clínica de teste','Contato sintético','WhatsApp','Evidência fictícia da abordagem') returning id",
      [rep],
    );
    opportunity = r.rows[0]!["id"] as string;
    await expect(
      asUser(rep, "update public.carla_opportunities set status='protected' where id=$1", [
        opportunity,
      ]),
    ).rejects.toThrow();
    expect((await asUser(other, "select * from public.carla_opportunities")).rows).toHaveLength(0);
    await asUser(
      admin,
      "select public.carla_review_opportunity($1,true,'Abordagem e ausência de duplicidade conferidas')",
      [opportunity],
    );
    client = (
      await asUser(
        admin,
        "select public.carla_create_client($1,'Cliente sintético','TEST-CONTRACT',now()-interval '10 days',now()-interval '11 days') as id",
        [opportunity],
      )
    ).rows[0]!["id"] as string;
    cycle = (await asUser(rep, "select id from public.carla_retention_cycles")).rows[0]![
      "id"
    ] as string;
  });
  it("rejects fabricated cycles and requires two attempts on distinct local days", async () => {
    await expect(
      asUser(
        admin,
        "select public.carla_review_cycle($1,'fulfilled','Revisão de cumprimento do protocolo')",
        [cycle],
      ),
    ).rejects.toThrow("duas tentativas");
    const sql = `insert into public.carla_retention_contacts(cycle_id,representative_id,occurred_at,channel,interlocutor,subject,result,satisfaction,risk,referral,recipient,next_step,evidence,responded) values($1,$2,$3,'WhatsApp','Contato sintético','Acompanhamento','Sem resposta','Não avaliada','Não avaliado','Não se aplica','Empresa','Nova tentativa','Evidência individualizada fictícia',false)`;
    await expect(asUser(other, sql, [cycle, other, "2026-10-05T12:00:00Z"])).rejects.toThrow();
    await asUser(rep, sql, [cycle, rep, new Date(Date.now() - 3 * 86400000).toISOString()]);
    await asUser(rep, sql, [cycle, rep, new Date(Date.now() - 3 * 86400000 + 60000).toISOString()]);
    await expect(
      asUser(
        admin,
        "select public.carla_review_cycle($1,'fulfilled','Revisão de cumprimento do protocolo')",
        [cycle],
      ),
    ).rejects.toThrow("duas tentativas");
    await asUser(rep, sql, [cycle, rep, new Date(Date.now() - 2 * 86400000).toISOString()]);
    await asUser(
      admin,
      "select public.carla_review_cycle($1,'fulfilled','Duas tentativas em dias distintos comprovadas')",
      [cycle],
    );
  });
  it("apportions partial receipts by competence and avoids expansion double counting", async () => {
    const payload = {
      client_id: client,
      competence: 2,
      kind: "monthly",
      due_at: new Date().toISOString(),
      original_cents: 199700,
      expansion_cents: 100000,
      expansion_event: "TEST-EXPAND",
      expansion_index: 1,
      expansion_evidence: "Expansão autorizada documentada",
      retention_cycle_id: cycle,
    };
    const iid = (
      await asUser(admin, "select public.carla_create_invoice($1::jsonb) as id", [
        JSON.stringify(payload),
      ])
    ).rows[0]!["id"];
    await expect(
      asUser(
        rep,
        "select public.carla_record_receipt($1,100,'TEST-X',now(),'Prova sintética de pagamento')",
        [iid],
      ),
    ).rejects.toThrow();
    for (const ref of ["TEST-PART-1", "TEST-PART-2"])
      await asUser(
        admin,
        "select public.carla_record_receipt($1,149850,$2,now()-interval '1 hour','Prova sintética de pagamento')",
        [iid, ref],
      );
    const r = await asUser(
      rep,
      "select kind,sum(amount_cents)::int as cents from public.carla_commissions group by kind order by kind",
    );
    expect(r.rows).toEqual([
      { kind: "acquisition", cents: 19970 },
      { kind: "expansion", cents: 20000 },
    ]);
    await expect(
      asUser(
        admin,
        "select public.carla_record_receipt($1,100,'TEST-EXCESS',now(),'Prova sintética de pagamento')",
        [iid],
      ),
    ).rejects.toThrow("excedente");
    expect((await asUser(other, "select * from public.carla_commissions")).rows).toHaveLength(0);
  });
  it("combines renewal with original retention and initial expansion without extra 5%", async () => {
    const payload = {
      client_id: client,
      competence: 4,
      kind: "monthly",
      due_at: new Date().toISOString(),
      original_cents: 199700,
      expansion_cents: 100000,
      expansion_event: "TEST-EXPAND-2",
      expansion_index: 1,
      expansion_evidence: "Expansão autorizada documentada",
      renewal_event: "TEST-RENEWAL",
      renewal_evidence: "Renovação e participação relevante documentadas",
      retention_cycle_id: cycle,
    };
    const iid = (
      await asUser(admin, "select public.carla_create_invoice($1::jsonb) as id", [
        JSON.stringify(payload),
      ])
    ).rows[0]!["id"];
    await asUser(
      admin,
      "select public.carla_record_receipt($1,299700,'TEST-RENEW-CREDIT',now(),'Prova sintética de pagamento')",
      [iid],
    );
    const r = await asUser(
      rep,
      "select sum(amount_cents)::int as cents from public.carla_commissions where invoice_id=$1",
      [iid],
    );
    expect(r.rows).toEqual([{ cents: 89925 }]);
  });
  it("uses tier 2 for the second sale and preserves delayed acquisition after suspension", async () => {
    const o = (
      await asUser(
        rep,
        "insert into public.carla_opportunities(representative_id,company,contact,channel,evidence) values($1,'Outro teste','Contato sintético','WhatsApp','Evidência fictícia da abordagem') returning id",
        [rep],
      )
    ).rows[0]!["id"];
    await asUser(
      admin,
      "select public.carla_review_opportunity($1,true,'Atribuição elegível comprovada para teste')",
      [o],
    );
    const cid = (
      await asUser(
        admin,
        "select public.carla_create_client($1,'Segundo sintético','TEST-SECOND',now()-interval '10 days',now()-interval '11 days') as id",
        [o],
      )
    ).rows[0]!["id"];
    const iid = (
      await asUser(admin, "select public.carla_create_invoice($1::jsonb) as id", [
        JSON.stringify({
          client_id: cid,
          competence: 1,
          kind: "setup",
          due_at: new Date().toISOString(),
          original_cents: 199700,
          expansion_cents: 0,
        }),
      ])
    ).rows[0]!["id"];
    await asUser(
      admin,
      "select public.carla_record_receipt($1,199700,'TEST-SECOND-CREDIT',now(),'Crédito sintético conciliado')",
      [iid],
    );
    expect(
      (
        await asUser(
          rep,
          "select amount_cents::int from public.carla_commissions where invoice_id=$1",
          [iid],
        )
      ).rows,
    ).toEqual([{ amount_cents: 69895 }]);
    const late = (
      await asUser(admin, "select public.carla_create_invoice($1::jsonb) as id", [
        JSON.stringify({
          client_id: client,
          competence: 3,
          kind: "monthly",
          due_at: new Date().toISOString(),
          original_cents: 199700,
          expansion_cents: 0,
        }),
      ])
    ).rows[0]!["id"];
    await asUser(
      admin,
      "select public.carla_review_profile($1,'suspended','Suspensão sintética sem perda de direitos anteriores')",
      [rep],
    );
    await asUser(
      admin,
      "select public.carla_record_receipt($1,199700,'TEST-LATE-CREDIT',now(),'Crédito atrasado de aquisição conciliado')",
      [late],
    );
    expect(
      (
        await asUser(
          admin,
          "select kind,amount_cents::int from public.carla_commissions where invoice_id=$1",
          [late],
        )
      ).rows,
    ).toEqual([{ kind: "acquisition", amount_cents: 19970 }]);
    await asUser(
      admin,
      "select public.carla_review_profile($1,'active','Reativação sintética com cadastro conferido')",
      [rep],
    );
  });
  it("blocks unreviewed retention, missing expansion proof and duplicate bank reference", async () => {
    const base = {
      client_id: client,
      competence: 5,
      kind: "monthly",
      due_at: new Date().toISOString(),
      original_cents: 199700,
      expansion_cents: 0,
    };
    await expect(
      asUser(admin, "select public.carla_create_invoice($1::jsonb)", [JSON.stringify(base)]),
    ).rejects.toThrow("análise do protocolo");
    await expect(
      asUser(admin, "select public.carla_create_invoice($1::jsonb)", [
        JSON.stringify({
          ...base,
          competence: 6,
          retention_cycle_id: cycle,
          expansion_cents: 100000,
          expansion_index: 1,
          expansion_event: "NO-PROOF",
        }),
      ]),
    ).rejects.toThrow();
    const iid = (
      await asUser(admin, "select public.carla_create_invoice($1::jsonb) as id", [
        JSON.stringify({ ...base, retention_cycle_id: cycle }),
      ])
    ).rows[0]!["id"];
    await asUser(
      admin,
      "select public.carla_record_receipt($1,10000,'TEST-IDEMPOTENT',now(),'Crédito parcial sintético documentado')",
      [iid],
    );
    await expect(
      asUser(
        admin,
        "select public.carla_record_receipt($1,10000,'TEST-IDEMPOTENT',now(),'Crédito parcial sintético documentado')",
        [iid],
      ),
    ).rejects.toThrow();
    expect(
      (
        await asUser(admin, "select received_cents::int from public.carla_invoices where id=$1", [
          iid,
        ])
      ).rows,
    ).toEqual([{ received_cents: 10000 }]);
  });
  it("transfers prospectively, closes old cycles and retains accrued ledger entries", async () => {
    const before = (await asUser(admin, "select count(*)::int as n from public.carla_commissions"))
      .rows;
    await asUser(
      admin,
      "select public.carla_transfer_client($1,$2,'Transição sintética por acordo formal','Termo sintético com clientes vencimentos e demandas')",
      [client, other],
    );
    expect(
      (await asUser(admin, "select count(*)::int as n from public.carla_commissions")).rows,
    ).toEqual(before);
    expect(
      (await asUser(other, "select id from public.carla_clients where id=$1", [client])).rows,
    ).toHaveLength(1);
    expect(
      (
        await asUser(
          rep,
          "select * from public.carla_retention_cycles where client_id=$1 and status='open'",
          [client],
        )
      ).rows,
    ).toHaveLength(0);
    await expect(
      asUser(
        rep,
        "select public.carla_record_adjustment($1,null,100,'Correção sintética justificada','Prova sintética de correção')",
        [rep],
      ),
    ).rejects.toThrow();
    await asUser(
      admin,
      "select public.carla_record_adjustment($1,null,100,'Correção sintética justificada','Prova sintética de correção')",
      [rep],
    );
    expect((await asUser(other, "select * from public.carla_adjustments")).rows).toHaveLength(0);
  });
  it("public card verification exposes only name and registration and revokes suspended cards", async () => {
    const token = (await asUser(rep, "select card_token from public.carla_profiles")).rows[0]![
      "card_token"
    ];
    expect(
      Object.keys(
        (await asUser(null, "select * from public.carla_verify_card($1)", [token])).rows[0]!,
      ),
    ).toEqual(["name", "registration"]);
    await expect(asUser(null, "select * from public.carla_profiles")).rejects.toThrow();
    await asUser(
      admin,
      "select public.carla_review_profile($1,'suspended','Suspensão sintética documentada para teste')",
      [rep],
    );
    expect(
      (await asUser(null, "select * from public.carla_verify_card($1)", [token])).rows,
    ).toHaveLength(0);
    expect((await asUser(rep, "select * from public.carla_commissions")).rows).toHaveLength(0);
    expect(
      (await asUser(admin, "select * from public.carla_commissions")).rows.length,
    ).toBeGreaterThan(0);
  });
});
