import { readFileSync } from "node:fs";
import { randomUUID, randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

// Explicit remote smoke test. Only synthetic accounts are created and removed.
const access = readFileSync("acessos.md", "utf8");
const url = "https://zhfputohhpvwcdozamtm.supabase.co";
const service = [...access.matchAll(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g)]
  .map((m) => m[0])
  .find(
    (token) => JSON.parse(Buffer.from(token.split(".")[1], "base64url")).role === "service_role",
  );
const key = access.match(/sb_publishable_[\w-]+/)[0];
const pat = access.match(/sbp_[\w-]+/)[0];
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const root = createClient(url, service, options);
const fixtures = [];
const clients = [];
async function sql(query) {
  const response = await fetch(
    "https://api.supabase.com/v1/projects/zhfputohhpvwcdozamtm/database/query",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${pat}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok) throw new Error(`Management SQL HTTP ${response.status}`);
  return response.json();
}
function ok(result) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
async function account(document) {
  const suffix = randomUUID();
  const email = `carla-test-${suffix}@example.invalid`;
  const password = randomBytes(32).toString("base64url");
  const user = ok(
    await root.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: document
        ? {
            carla_signup: "true",
            name: "Conta Sintética CARLA",
            registration: `TEST-${suffix}`,
            document,
            address: "Endereço sintético completo para teste",
            phone: "21999999999",
            role: "admin",
            status: "active",
          }
        : {},
    }),
  ).user;
  fixtures.push(user.id);
  const client = createClient(url, key, options);
  clients.push(client);
  ok(await client.auth.signInWithPassword({ email, password }));
  return { id: user.id, client };
}
let failure;
try {
  const rep = await account("52998224725");
  const other = await account("11144477735");
  const admin = await account();
  await sql(`insert into carla_private.admins(user_id) values('${admin.id}')`);
  const profiles = ok(await rep.client.from("carla_profiles").select("*"));
  assert.equal(profiles.length, 1);
  assert.equal(profiles[0].status, "pending");
  assert.equal(ok(await rep.client.rpc("carla_is_admin")), false);
  assert.ok(
    (await rep.client.from("carla_profiles").update({ status: "active" }).eq("id", rep.id)).error,
  );
  const photo = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf1sAAAAASUVORK5CYII=",
    "base64",
  );
  const path = `${rep.id}/test.png`;
  assert.ok(
    (
      await other.client.storage
        .from("carla-photos")
        .upload(path, photo, { contentType: "image/png" })
    ).error,
  );
  ok(
    await rep.client.storage.from("carla-photos").upload(path, photo, { contentType: "image/png" }),
  );
  ok(await rep.client.from("carla_profiles").update({ photo_path: path }).eq("id", rep.id));
  ok(
    await admin.client.rpc("carla_review_profile", {
      profile_id: rep.id,
      new_status: "active",
      reason: "Homologação sintética sem vínculo comercial real",
    }),
  );
  assert.ok(ok(await rep.client.storage.from("carla-photos").createSignedUrl(path, 60)).signedUrl);
  assert.ok((await other.client.storage.from("carla-photos").createSignedUrl(path, 60)).error);
  const anonymous = createClient(url, key, options);
  assert.ok((await anonymous.from("carla_profiles").select("*")).error);
  assert.ok(
    (
      await anonymous.rpc("carla_review_profile", {
        profile_id: rep.id,
        new_status: "suspended",
        reason: "Teste",
      })
    ).error,
  );
  const verified = ok(await anonymous.rpc("carla_verify_card", { token: profiles[0].card_token }));
  assert.equal(verified.length, 1);
  assert.equal("document" in verified[0], false);
  ok(
    await admin.client.rpc("carla_review_profile", {
      profile_id: rep.id,
      new_status: "suspended",
      reason: "Suspensão sintética para validar bloqueio",
    }),
  );
  assert.equal(
    ok(await anonymous.rpc("carla_verify_card", { token: profiles[0].card_token })).length,
    0,
  );
  console.log(
    "PASS: Auth real, metadata sem privilégios, RLS cruzada, bloqueio anônimo, Storage privado, aprovação, QR mínimo e suspensão.",
  );
} catch (error) {
  failure = error;
} finally {
  for (const client of clients) await client.auth.signOut();
  for (const id of fixtures) {
    assert.match(id, /^[0-9a-f-]{36}$/i);
    const entries = ok(await root.storage.from("carla-photos").list(id));
    if (entries.length)
      ok(
        await root.storage.from("carla-photos").remove(entries.map((item) => `${id}/${item.name}`)),
      );
    await sql(
      `delete from public.carla_audit where actor='${id}' or record_id='${id}'; delete from public.carla_profiles where id='${id}'; delete from carla_private.admins where user_id='${id}';`,
    );
    ok(await root.auth.admin.deleteUser(id));
  }
  console.log(`Limpeza concluída: ${fixtures.length} contas sintéticas removidas.`);
}
if (failure) {
  console.error(failure.message);
  process.exitCode = 1;
}
