import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import QRCode from "qrcode";
import {
  carlaClient,
  date,
  money,
  validCPF,
  type Profile,
  type Client,
  type Opportunity,
  type Cycle,
  type Invoice,
  type Commission,
} from "@/lib/carla";
import "./portal.css";
import { CarlaWallet } from "./wallet";

type FormValues = Record<
  | "name"
  | "registration"
  | "document"
  | "address"
  | "phone"
  | "email"
  | "password"
  | "photo"
  | "company"
  | "contact"
  | "channel"
  | "evidence"
  | "approved"
  | "reason"
  | "opportunity_id"
  | "occurred_at"
  | "opportunity"
  | "client_name"
  | "contract"
  | "activation"
  | "decision"
  | "cycle_id"
  | "interlocutor"
  | "subject"
  | "responded"
  | "result"
  | "satisfaction"
  | "risk"
  | "referral"
  | "recipient"
  | "next_step"
  | "commission_id"
  | "payment"
  | "paid"
  | "new_status"
  | "client_id"
  | "kind"
  | "competence"
  | "due_at"
  | "original_cents"
  | "expansion_cents"
  | "retention_cycle_id"
  | "expansion_event"
  | "expansion_index"
  | "expansion_evidence"
  | "renewal_event"
  | "renewal_evidence"
  | "invoice"
  | "cents"
  | "reference"
  | "settlement"
  | "proof"
  | "acceptance"
  | "new_owner"
  | "answer"
  | "owner"
  | "commission"
  | "new_status",
  string
>;
type Field = {
  name: string;
  label: string;
  type?: string;
  options?: { value: string; label: string }[];
  optional?: boolean;
};
type Contact = {
  id: string;
  subject: string;
  occurred_at: string;
  channel: string;
  interlocutor: string;
  result: string;
  satisfaction: string;
  risk: string;
  referral: string;
  recipient: string;
  next_step: string;
  evidence: string;
};
type Interaction = {
  id: string;
  opportunity_id: string;
  occurred_at: string;
  evidence: string;
  confirmed: boolean;
};
type Dispute = { id: string; reason: string; status: string; response: string | null };
type Adjustment = {
  id: string;
  representative_id: string;
  amount_cents: number;
  reason: string;
  evidence: string;
  status: string;
};
function Form({
  fields,
  submit,
  label = "Salvar",
}: {
  fields: Field[];
  submit: (data: FormValues, form: HTMLFormElement) => Promise<void>;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setMessage("");
    try {
      await submit(
        Object.fromEntries(
          [...new FormData(form)].filter(([, v]) => typeof v === "string"),
        ) as FormValues,
        form,
      );
      setMessage("Operação concluída.");
      form.reset();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message === "Invalid login credentials"
            ? "E-mail ou senha incorretos. Se abriu o link de recuperação, defina sua nova senha antes de entrar."
            : error.message
          : "Não foi possível salvar. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={send} className="carla-form">
      {fields.map((f) => (
        <label key={f.name}>
          {f.label}
          {f.options ? (
            <select name={f.name} required={!f.optional}>
              <option value="">Selecione</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : f.type === "textarea" ? (
            <textarea name={f.name} required={!f.optional} maxLength={4000} />
          ) : (
            <input
              name={f.name}
              type={f.type ?? "text"}
              required={!f.optional}
              min={f.type === "number" && f.name !== "cents" ? 0 : undefined}
              step={f.type === "number" ? "1" : undefined}
              minLength={f.type === "password" ? 12 : undefined}
              accept={f.type === "file" ? "image/png,image/jpeg,image/webp" : undefined}
            />
          )}
        </label>
      ))}
      <button disabled={busy}>{busy ? "Aguarde…" : label}</button>
      {message && (
        <p className="carla-message" role="status">
          {message}
        </p>
      )}
    </form>
  );
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="carla-panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
function List({ children }: { children: ReactNode }) {
  return <div className="carla-list">{children}</div>;
}
const option = (value: string, label: string) => ({ value, label });
const timestamp = (value: string) => new Date(value).toISOString();
const evidence: Field = {
  name: "evidence",
  label: "Evidência lícita (referência do documento ou relato verificável)",
  type: "textarea",
};
const reason: Field = { name: "reason", label: "Justificativa documentada", type: "textarea" };

export function CarlaPortal({ admin = false }: { admin?: boolean }) {
  const [db] = useState(carlaClient);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup" | "reset" | "password">("login");
  const [tab, setTab] = useState("dashboard");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [photo, setPhoto] = useState("");
  const [qr, setQR] = useState("");
  const requestVersion = useRef(0);

  async function refresh(id: string) {
    if (!db) return;
    const version = ++requestVersion.current;
    setLoading(true);
    setError("");
    try {
      const [p, a] = await Promise.all([
        db.from("carla_profiles").select("*").eq("id", id).maybeSingle(),
        db.rpc("carla_is_admin"),
      ]);
      if (version !== requestVersion.current) return;
      if (p.error) throw p.error;
      if (a.error) throw a.error;
      setProfile(p.data);
      setIsAdmin(a.data === true);
      if ((admin && a.data !== true) || (!admin && p.data?.status !== "active")) {
        setClients([]);
        setOpportunities([]);
        setCycles([]);
        setInvoices([]);
        setCommissions([]);
        setPhoto("");
        setQR("");
        return;
      }
      const tables = [
        "carla_clients",
        "carla_opportunities",
        "carla_retention_cycles",
        "carla_invoices",
        "carla_commissions",
        "carla_retention_contacts",
        "carla_opportunity_interactions",
        "carla_disputes",
        "carla_adjustments",
      ];
      const results = await Promise.all(
        tables.map(async (t) => {
          const data: unknown[] = [];
          for (let offset = 0; offset < 50000; offset += 1000) {
            const q = db
              .from(t)
              .select("*")
              .order("id")
              .range(offset, offset + 999);
            const r = await (admin ? q : q.eq("representative_id", id));
            if (r.error) return { data: null, error: r.error };
            data.push(...r.data);
            if (r.data.length < 1000) return { data, error: null };
          }
          throw new Error("Volume excede o limite de consulta. Solicite relatório administrativo.");
        }),
      );
      if (version !== requestVersion.current) return;
      if (results.length !== 9) throw new Error("Resposta incompleta.");
      for (const r of results) if (r.error) throw r.error;
      setClients(results[0]!.data as Client[]);
      setOpportunities(results[1]!.data as Opportunity[]);
      setCycles(results[2]!.data as Cycle[]);
      setInvoices(results[3]!.data as Invoice[]);
      setCommissions(results[4]!.data as Commission[]);
      setContacts(results[5]!.data as Contact[]);
      setInteractions(results[6]!.data as Interaction[]);
      setDisputes(results[7]!.data as Dispute[]);
      setAdjustments(results[8]!.data as Adjustment[]);
      if (admin) {
        const r = await db.from("carla_profiles").select("*");
        if (version !== requestVersion.current) return;
        if (r.error) throw r.error;
        setProfiles(r.data ?? []);
      }
      if (p.data?.status === "active") {
        if (p.data.photo_path) {
          const r = await db.storage.from("carla-photos").createSignedUrl(p.data.photo_path, 300);
          if (version !== requestVersion.current) return;
          if (r.error) throw r.error;
          setPhoto(r.data.signedUrl);
        }
        const image = await QRCode.toDataURL(
          `${window.location.origin}/verificar?id=${p.data.card_token}`,
          {
            width: 180,
            margin: 4,
          },
        );
        if (version !== requestVersion.current) return;
        setQR(image);
      }
    } catch (e) {
      if (version !== requestVersion.current) return;
      setClients([]);
      setOpportunities([]);
      setCommissions([]);
      setCycles([]);
      setInvoices([]);
      setContacts([]);
      setInteractions([]);
      setDisputes([]);
      setAdjustments([]);
      setProfiles([]);
      setProfile(null);
      setIsAdmin(false);
      setPhoto("");
      setQR("");
      setError(
        e instanceof Error
          ? e.message
          : ((e as { message?: string }).message ?? "Falha ao carregar."),
      );
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }
  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    let live = true;
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((event, session) => {
      if (!live) return;
      requestVersion.current++;
      setLoading(!!session);
      setUserId(session?.user.id ?? null);
      setUserEmail(session?.user.email ?? "");
      if (event === "PASSWORD_RECOVERY") setAuthMode("password");
      if (session)
        setTimeout(() => {
          if (live) void refresh(session.user.id);
        }, 0);
      else {
        setProfile(null);
        setIsAdmin(false);
        setClients([]);
        setCommissions([]);
        setLoading(false);
      }
    });
    return () => {
      live = false;
      // Intentionally invalidate pending network requests when leaving the portal.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      requestVersion.current++;
      subscription.unsubscribe();
    };
    // The Supabase instance is stable for this mounted portal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, admin]);
  async function switchAccount() {
    if (!db) return;
    const result = await db.auth.signOut({ scope: "local" });
    if (result.error) {
      setError("Não foi possível sair desta conta. Tente novamente.");
      return;
    }
    setAuthMode("login");
    setNotice("");
    setError("");
  }
  async function rpc(name: string, args: Record<string, unknown>) {
    if (!db || !userId) throw new Error("Faça login.");
    const r = await db.rpc(name, args);
    if (r.error) throw new Error(r.error.message);
    await refresh(userId);
  }
  async function insert(table: string, payload: Record<string, unknown>) {
    if (!db || !userId) throw new Error("Faça login.");
    const r = await db.from(table).insert({ ...payload, representative_id: userId });
    if (r.error) throw new Error(r.error.message);
    await refresh(userId);
  }
  async function upload(form: HTMLFormElement) {
    if (!db || !userId) throw new Error("Faça login para concluir o cadastro.");
    const file = new FormData(form).get("photo");
    if (
      !(file instanceof File) ||
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024 ||
      !file.size
    )
      throw new Error("Envie foto PNG, JPEG ou WebP com até 5 MB.");
    try {
      const bitmap = await createImageBitmap(file);
      const valid = bitmap.width > 0 && bitmap.height > 0;
      bitmap.close();
      if (!valid) throw new Error("Imagem inválida.");
    } catch {
      throw new Error("O arquivo não contém uma imagem válida.");
    }
    const path = `${userId}/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
    const r = await db.storage.from("carla-photos").upload(path, file, { contentType: file.type });
    if (r.error) throw new Error(r.error.message);
    const p = await db
      .from("carla_profiles")
      .update({ photo_path: path })
      .eq("id", userId)
      .select("id");
    if (p.error || !p.data?.length) {
      await db.storage.from("carla-photos").remove([path]);
      throw new Error(p.error?.message ?? "Cadastro não atualizado.");
    }
    await refresh(userId);
  }
  const authFields: Field[] =
    authMode === "signup"
      ? [
          { name: "name", label: "Nome completo" },
          { name: "document", label: "CPF (11 dígitos)" },
          { name: "address", label: "Endereço completo, número, bairro, cidade, UF e CEP" },
          { name: "phone", label: "Celular com DDD", type: "tel" },
          { name: "email", label: "E-mail", type: "email" },
          { name: "password", label: "Senha (mínimo 12 caracteres)", type: "password" },
        ]
      : authMode === "password"
        ? [{ name: "password", label: "Nova senha (mínimo 12 caracteres)", type: "password" }]
        : [
            { name: "email", label: "E-mail", type: "email" },
            ...(authMode === "login"
              ? [{ name: "password", label: "Senha", type: "password" }]
              : []),
          ];
  const clientOptions = clients.map((c) => option(c.id, c.name));
  const representativeName = (id: string) =>
    profiles.find((p) => p.id === id)?.name ?? profile?.name ?? id;
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? id;
  const activeCycles = cycles.filter((c) => ["open", "submitted", "rejected"].includes(c.status));
  const accrued = commissions
    .filter((c) => c.status === "accrued")
    .reduce((s, c) => s + c.amount_cents, 0);
  function exportStatement() {
    const rows = [
      ["Tipo", "Competência", "Valor (centavos)", "Status", "Vencimento"],
      ...commissions.map((c) => [
        c.kind,
        String(invoices.find((i) => i.id === c.invoice_id)?.competence ?? ""),
        String(c.amount_cents),
        c.status,
        c.due_date,
      ]),
    ];
    const csv =
      "\ufeff" +
      rows.map((row) => row.map((v) => `"${v.replaceAll('"', '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "demonstrativo-carla.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <main className="carla-portal">
      <header className="carla-header">
        <a href="/" className="carla-brand">
          OLIVEIRA VITTAE <span>DESIGNER & IA · CARLA</span>
        </a>
        <div>
          {userEmail && <span className="carla-account">Conta: {userEmail}</span>}
          <a href={admin ? "/representantes" : "/admin"}>
            {admin ? "Representantes" : "Administração"}
          </a>
          {userId && <button onClick={() => setAuthMode("password")}>Definir senha</button>}
          {userId && (
            <button
              onClick={() => {
                void switchAccount();
              }}
            >
              Sair
            </button>
          )}
        </div>
      </header>
      <div className="carla-content">
        <p className="carla-eyebrow">ÁREA COMERCIAL</p>
        <h1>
          {admin || (isAdmin && !profile) ? "Administração CARLA" : "Sua carteira. Seu desempenho."}
        </h1>
        {notice && <p role="status">{notice}</p>}
        {!db ? (
          <Section title="Conexão pendente">
            <p>
              A Área CARLA está aguardando a configuração do projeto Supabase. O site institucional
              continua disponível.
            </p>
          </Section>
        ) : loading ? (
          <p role="status">Carregando informações…</p>
        ) : (
          <>
            {error && (
              <div className="carla-message" role="alert">
                {error}
                <button onClick={() => userId && void refresh(userId)}>Tentar novamente</button>
              </div>
            )}
            {!userId || authMode === "password" ? (
              <Section
                title={
                  authMode === "signup"
                    ? "Solicitar cadastro"
                    : authMode === "reset"
                      ? "Recuperar acesso"
                      : authMode === "password"
                        ? "Definir nova senha"
                        : "Acesse sua área"
                }
              >
                <Form
                  fields={authFields}
                  label={
                    authMode === "signup"
                      ? "Cadastrar e confirmar e-mail"
                      : authMode === "reset"
                        ? "Enviar recuperação"
                        : authMode === "password"
                          ? "Atualizar senha"
                          : "Entrar"
                  }
                  submit={async (d) => {
                    let r;
                    if (authMode === "signup") {
                      const document = d.document.replace(/\D/g, "");
                      if (!validCPF(document)) throw new Error("CPF inválido.");
                      if (d.name.trim().split(/\s+/).length < 2 || d.address.trim().length < 15)
                        throw new Error("Informe nome e endereço completos.");
                      r = await db.auth.signUp({
                        email: d.email,
                        password: d.password,
                        options: {
                          emailRedirectTo: `${window.location.origin}/representantes`,
                          data: {
                            carla_signup: "true",
                            name: d.name.trim(),
                            document,
                            address: d.address.trim(),
                            phone: d.phone.replace(/\D/g, ""),
                          },
                        },
                      });
                      if (r.error) throw new Error(r.error.message);
                      setAuthMode("login");
                      window.alert(
                        "Confirme seu e-mail e faça login para enviar a foto obrigatória. O acesso comercial depende da aprovação.",
                      );
                    } else if (authMode === "reset")
                      r = await db.auth.resetPasswordForEmail(d.email, {
                        redirectTo: `${window.location.origin}/representantes`,
                      });
                    else if (authMode === "password") {
                      r = await db.auth.updateUser({ password: d.password });
                      if (!r.error) {
                        setNotice(
                          "Senha definida. Use esta nova senha para entrar no painel administrativo.",
                        );
                        setAuthMode("login");
                      }
                    } else
                      r = await db.auth.signInWithPassword({
                        email: d.email,
                        password: d.password,
                      });
                    if (r.error) throw new Error(r.error.message);
                  }}
                />
                <div className="carla-actions">
                  <button onClick={() => setAuthMode("login")}>Login</button>
                  {!admin && <button onClick={() => setAuthMode("signup")}>Novo cadastro</button>}
                  <button onClick={() => setAuthMode("reset")}>Esqueci minha senha</button>
                </div>
                {authMode === "signup" && (
                  <p>
                    Sua matrícula CLR-2026 será gerada automaticamente no cadastro. A foto é
                    obrigatória na próxima etapa, após confirmação do e-mail. A aprovação verifica
                    cadastro, matrícula, foto e vínculo formalizado.
                  </p>
                )}
              </Section>
            ) : error ? (
              <Section title="Não foi possível verificar seu acesso">
                <p>A consulta falhou. Clique em Tentar novamente para conferir suas permissões.</p>
              </Section>
            ) : admin && !isAdmin ? (
              <Section title="Acesso restrito">
                <p>
                  A conta <strong>{userEmail || "conectada"}</strong> não possui permissão
                  administrativa.
                </p>
                <p>
                  Para administrar a CARLA, entre com sua conta administrativa. Se estiver usando a
                  demonstração, acesse a Área de Representantes.
                </p>
                <div className="carla-actions">
                  <button onClick={() => void switchAccount()}>Entrar com outra conta</button>
                  <a href="/representantes/">Área de Representantes</a>
                </div>
              </Section>
            ) : !admin && isAdmin && !profile ? (
              <Section title="Conta administrativa">
                <p>
                  Você está conectado como administrador. Acesse o painel para gerenciar
                  representantes, clientes e comissões.
                </p>
                <div className="carla-actions">
                  <a className="carla-admin-entry" href="/admin/">
                    Acessar painel administrativo
                  </a>
                </div>
              </Section>
            ) : !admin && profile?.status !== "active" ? (
              <Section
                title={
                  profile?.status === "pending"
                    ? "Cadastro em análise"
                    : "Acesso comercial indisponível"
                }
              >
                {profile?.status !== "pending" && (
                  <p>
                    {profile
                      ? `Situação: ${profile.status === "pending" ? "aguardando aprovação" : profile.status === "suspended" ? "suspenso" : "encerrado"}.`
                      : "Seu usuário não possui cadastro de representante CARLA."}
                  </p>
                )}
                {profile?.status === "pending" && (
                  <>
                    <div className="carla-approval-notice" role="status">
                      <strong>
                        {profile.photo_path
                          ? "Foto recebida. Seu cadastro aguarda aprovação."
                          : "Falta enviar sua foto para concluir o cadastro."}
                      </strong>
                      <p>
                        {profile.photo_path
                          ? "A administração vai conferir seus dados e sua foto. O acesso à área comercial será liberado após a aprovação. Você não precisa enviar a foto novamente."
                          : "Escolha uma foto de perfil e clique em Enviar foto. Depois do envio, a administração fará a conferência para liberar seu acesso."}
                      </p>
                    </div>
                    <Form
                      fields={[
                        {
                          name: "photo",
                          label: profile.photo_path
                            ? "Substituir foto (opcional, até 5 MB)"
                            : "Foto de perfil (até 5 MB)",
                          type: "file",
                        },
                      ]}
                      submit={async (_, f) => upload(f)}
                      label={profile.photo_path ? "Substituir foto" : "Enviar foto"}
                    />
                  </>
                )}
              </Section>
            ) : (
              <>
                <nav className="carla-tabs" aria-label="Seções comerciais">
                  {[
                    ["dashboard", "Visão geral"],
                    ["opportunities", "Oportunidades"],
                    ["clients", "Clientes"],
                    ["retention", "Retenção"],
                    ["commissions", "Comissões"],
                    ...(admin
                      ? [
                          ["approvals", "Aprovações"],
                          ["finance", "Financeiro"],
                        ]
                      : [["card", "Carteira digital"]]),
                    ["materials", "Material comercial"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      aria-current={tab === id ? "page" : undefined}
                      onClick={() => setTab(id!)}
                    >
                      {label}
                    </button>
                  ))}
                  <button onClick={() => void refresh(userId)}>Atualizar</button>
                </nav>
                {tab === "dashboard" && (
                  <>
                    <div className="carla-metrics">
                      {[
                        [
                          "Clientes ativos",
                          String(clients.filter((c) => c.status === "active").length),
                        ],
                        [
                          "Oportunidades protegidas",
                          String(
                            opportunities.filter(
                              (o) =>
                                o.status === "protected" &&
                                new Date(o.protected_until ?? 0) > new Date(),
                            ).length,
                          ),
                        ],
                        ["Comissões a pagar", money(accrued)],
                        [
                          "Recebimentos conciliados",
                          money(invoices.reduce((s, i) => s + i.received_cents, 0)),
                        ],
                      ].map(([label, value]) => (
                        <article key={label}>
                          <p>{label}</p>
                          <strong>{value}</strong>
                        </article>
                      ))}
                    </div>
                    <Section title="Acompanhamentos pendentes">
                      <List>
                        {activeCycles.map((c) => (
                          <article key={c.id}>
                            <strong>{clientName(c.client_id)}</strong>
                            <p>
                              Até {date(c.ends_at)} ·{" "}
                              {new Date(c.ends_at) < new Date()
                                ? "Prazo ultrapassado — registrar impedimento para análise"
                                : "Ciclo em andamento"}
                            </p>
                          </article>
                        ))}
                      </List>
                      {!activeCycles.length && <p>Nenhum ciclo pendente.</p>}
                    </Section>
                    <p>
                      Os valores exibidos vêm dos registros conciliados. Comissão prevista não
                      representa recebimento garantido. Consultas paginadas; os totais consideram
                      todos os registros carregados.
                    </p>
                  </>
                )}
                {tab === "opportunities" && (
                  <>
                    {!admin && (
                      <Section title="Registrar oportunidade">
                        <Form
                          fields={[
                            { name: "company", label: "Empresa / clínica" },
                            { name: "contact", label: "Contato e identificação da abordagem" },
                            { name: "channel", label: "Canal utilizado" },
                            evidence,
                          ]}
                          submit={async (d) => insert("carla_opportunities", d)}
                        />
                        <p>
                          O registro passa por confirmação e análise de duplicidade. A proteção de
                          90 dias exige evidência de abordagem.
                        </p>
                      </Section>
                    )}
                    <Section title="Oportunidades registradas">
                      <List>
                        {opportunities.map((o) => (
                          <article key={o.id}>
                            <strong>
                              #{o.sequence} · {o.company}
                            </strong>
                            <p>
                              {o.contact} · {o.status} · Proteção até {date(o.protected_until)}
                            </p>
                            <p>{o.evidence}</p>
                            {o.decision_reason && <p>Decisão: {o.decision_reason}</p>}
                            {admin && (
                              <Form
                                fields={[
                                  {
                                    name: "approved",
                                    label: "Decisão",
                                    options: [
                                      option("true", "Confirmar proteção"),
                                      option("false", "Recusar / retirar com justificativa"),
                                    ],
                                  },
                                  reason,
                                ]}
                                submit={async (d) =>
                                  rpc("carla_review_opportunity", {
                                    opportunity: o.id,
                                    approved: d.approved === "true",
                                    reason: d.reason,
                                  })
                                }
                              />
                            )}
                          </article>
                        ))}
                      </List>
                      {!opportunities.length && <p>Nenhuma oportunidade registrada.</p>}
                    </Section>
                    {!admin && (
                      <Section title="Interação comercial substancial">
                        <Form
                          fields={[
                            {
                              name: "opportunity_id",
                              label: "Oportunidade",
                              options: opportunities.map((o) => option(o.id, o.company)),
                            },
                            { name: "occurred_at", label: "Data e hora", type: "datetime-local" },
                            { name: "channel", label: "Canal" },
                            evidence,
                          ]}
                          submit={async (d) =>
                            insert("carla_opportunity_interactions", {
                              ...d,
                              occurred_at: timestamp(d.occurred_at),
                            })
                          }
                        />
                      </Section>
                    )}
                    <Section title="Histórico de interações">
                      <List>
                        {interactions.map((i) => (
                          <article key={String(i.id)}>
                            <p>
                              {opportunities.find((o) => o.id === i.opportunity_id)?.company} ·{" "}
                              {date(String(i.occurred_at))} ·{" "}
                              {i.confirmed ? "Confirmada" : "Aguardando análise"}
                            </p>
                            <p>{String(i.evidence)}</p>
                            {admin && !i.confirmed && (
                              <Form
                                fields={[reason]}
                                label="Confirmar e renovar proteção"
                                submit={async (d) =>
                                  rpc("carla_review_opportunity", {
                                    opportunity: i.opportunity_id,
                                    interaction: i.id,
                                    approved: true,
                                    reason: d.reason,
                                  })
                                }
                              />
                            )}
                          </article>
                        ))}
                      </List>
                    </Section>
                  </>
                )}
                {tab === "clients" && (
                  <>
                    <Section title="Clientes vinculados">
                      <List>
                        {clients.map((c) => (
                          <article key={c.id}>
                            <strong>{c.name}</strong>
                            <p>
                              {c.status} · Ativação {date(c.activated_at)} · Faixa{" "}
                              {c.tier ?? "aguardando primeiro crédito"}
                            </p>
                            <p>
                              Contrato: {c.contract_ref}
                              {admin && ` · ${representativeName(c.representative_id)}`}
                            </p>
                            {admin && (
                              <>
                                <Form
                                  fields={[
                                    {
                                      name: "new_status",
                                      label: "Situação do cliente",
                                      options: [
                                        option("active", "Ativo"),
                                        option("cancelled", "Cancelado"),
                                      ],
                                    },
                                    reason,
                                  ]}
                                  submit={async (d) =>
                                    rpc("carla_client_status", { client: c.id, ...d })
                                  }
                                />
                                <Form
                                  fields={[
                                    {
                                      name: "new_owner",
                                      label: "Transferir para representante ativo",
                                      options: profiles
                                        .filter(
                                          (p) =>
                                            p.status === "active" && p.id !== c.representative_id,
                                        )
                                        .map((p) => option(p.id, p.name)),
                                    },
                                    reason,
                                    {
                                      name: "proof",
                                      label:
                                        "Termo de transição, ciclos, vencimentos e demandas em curso",
                                      type: "textarea",
                                    },
                                  ]}
                                  label="Transferir com efeito a partir de agora"
                                  submit={async (d) =>
                                    rpc("carla_transfer_client", { client: c.id, ...d })
                                  }
                                />
                              </>
                            )}
                          </article>
                        ))}
                      </List>
                      {!clients.length && <p>Nenhum cliente atribuído.</p>}
                    </Section>
                    {admin && (
                      <Section title="Formalizar cliente e iniciar acompanhamento">
                        <Form
                          fields={[
                            {
                              name: "opportunity",
                              label: "Oportunidade confirmada",
                              options: opportunities
                                .filter((o) => o.status === "protected")
                                .map((o) => option(o.id, o.company)),
                            },
                            { name: "client_name", label: "Nome do cliente" },
                            { name: "contract", label: "Referência do contrato aceito" },
                            {
                              name: "activation",
                              label: "Ativação real da CARLA",
                              type: "datetime-local",
                            },
                            {
                              name: "acceptance",
                              label: "Data e hora do aceite da proposta",
                              type: "datetime-local",
                            },
                          ]}
                          submit={async (d) =>
                            rpc("carla_create_client", {
                              ...d,
                              activation: timestamp(d.activation),
                              acceptance: timestamp(d.acceptance),
                            })
                          }
                        />
                      </Section>
                    )}
                  </>
                )}
                {tab === "retention" && (
                  <>
                    <Section title="Protocolo de Retenção">
                      <p>
                        Contato individualizado em até 30 dias da ativação e dos acompanhamentos
                        válidos seguintes. Sem resposta, registre duas tentativas em dias distintos
                        dentro do ciclo. Encaminhe demandas técnicas à empresa. Falhas de canal e
                        impedimentos exigem análise documentada.
                      </p>
                      <List>
                        {cycles.map((c) => (
                          <article key={c.id}>
                            <strong>{clientName(c.client_id)}</strong>
                            <p>
                              {date(c.starts_at)} a {date(c.ends_at)} · {c.status}
                            </p>
                            {c.decision_reason && <p>{c.decision_reason}</p>}
                            {admin && ["open", "submitted", "rejected"].includes(c.status) && (
                              <Form
                                fields={[
                                  {
                                    name: "decision",
                                    label: "Decisão",
                                    options: [
                                      option("fulfilled", "Protocolo cumprido"),
                                      option(
                                        "exception",
                                        "Impedimento reconhecido / direitos preservados",
                                      ),
                                      option("rejected", "Não cumprido — decisão fundamentada"),
                                    ],
                                  },
                                  reason,
                                ]}
                                submit={async (d) =>
                                  rpc("carla_review_cycle", { cycle: c.id, ...d })
                                }
                              />
                            )}
                          </article>
                        ))}
                      </List>
                    </Section>
                    {!admin && (
                      <Section title="Registrar acompanhamento / tentativa">
                        <Form
                          fields={[
                            {
                              name: "cycle_id",
                              label: "Ciclo",
                              options: activeCycles.map((c) =>
                                option(c.id, `${clientName(c.client_id)} · ${date(c.ends_at)}`),
                              ),
                            },
                            { name: "occurred_at", label: "Data e hora", type: "datetime-local" },
                            { name: "channel", label: "Canal" },
                            { name: "interlocutor", label: "Interlocutor" },
                            { name: "subject", label: "Assunto" },
                            {
                              name: "responded",
                              label: "Houve resposta?",
                              options: [option("true", "Sim"), option("false", "Sem resposta")],
                            },
                            { name: "result", label: "Resposta ou resultado" },
                            ...["satisfaction", "risk", "referral", "recipient", "next_step"].map(
                              (name, i) => ({
                                name,
                                label: [
                                  "Satisfação (ou não avaliada)",
                                  "Risco de cancelamento",
                                  "Demanda encaminhada (ou não se aplica)",
                                  "Destinatário (ou não se aplica)",
                                  "Próximo passo",
                                ][i]!,
                              }),
                            ),
                            evidence,
                          ]}
                          submit={async (d) =>
                            insert("carla_retention_contacts", {
                              ...d,
                              occurred_at: timestamp(d.occurred_at),
                              responded: d.responded === "true",
                            })
                          }
                        />
                      </Section>
                    )}
                    <Section title="Evidências de acompanhamento">
                      <List>
                        {contacts.map((c) => (
                          <article key={String(c.id)}>
                            <strong>
                              {String(c.subject)} · {date(String(c.occurred_at))}
                            </strong>
                            <p>
                              {String(c.channel)} · {String(c.interlocutor)} · {String(c.result)}
                            </p>
                            <p>
                              Satisfação: {String(c.satisfaction)} · Risco: {String(c.risk)}
                            </p>
                            <p>
                              Encaminhamento: {String(c.referral)} → {String(c.recipient)} · Próximo
                              passo: {String(c.next_step)}
                            </p>
                            <p>Evidência: {String(c.evidence)}</p>
                          </article>
                        ))}
                      </List>
                    </Section>
                  </>
                )}
                {tab === "commissions" && (
                  <>
                    <Section title="Demonstrativo de comissões">
                      <button onClick={exportStatement}>Exportar CSV</button>
                      <List>
                        {commissions.map((c) => (
                          <article key={c.id}>
                            <strong>
                              {money(c.amount_cents)} · {c.kind}
                            </strong>
                            <p>
                              Competência {invoices.find((i) => i.id === c.invoice_id)?.competence}{" "}
                              · {c.status} · Vencimento regular{" "}
                              {date(c.due_date + "T12:00:00-03:00")}
                            </p>
                            {admin && c.status === "accrued" && (
                              <Form
                                fields={[
                                  { name: "payment", label: "Comprovante de pagamento" },
                                  {
                                    name: "paid",
                                    label: "Data do pagamento",
                                    type: "datetime-local",
                                  },
                                ]}
                                label="Confirmar pagamento"
                                submit={async (d) =>
                                  rpc("carla_pay_commission", {
                                    commission: c.id,
                                    payment: d.payment,
                                    paid: timestamp(d.paid),
                                  })
                                }
                              />
                            )}
                          </article>
                        ))}
                      </List>
                      {!commissions.length && <p>Nenhuma comissão apurada.</p>}
                      <p>
                        Vencimento regular: dia 15 do mês seguinte à liquidação. A administração
                        deve antecipar quando não houver expediente bancário e preservar vencimentos
                        legais.
                      </p>
                    </Section>
                    {!admin && (
                      <Section title="Contestar lançamento">
                        <Form
                          fields={[
                            {
                              name: "commission_id",
                              label: "Comissão",
                              options: commissions.map((c) =>
                                option(c.id, `${c.kind} · ${money(c.amount_cents)}`),
                              ),
                            },
                            reason,
                          ]}
                          submit={async (d) =>
                            insert("carla_disputes", {
                              commission_id: d.commission_id,
                              reason: d.reason,
                            })
                          }
                        />
                      </Section>
                    )}
                    <Section title="Ajustes documentados">
                      <List>
                        {adjustments.map((a) => (
                          <article key={a.id}>
                            <strong>{money(a.amount_cents)}</strong>
                            <p>
                              {a.reason} · {a.status}
                            </p>
                            <p>{a.evidence}</p>
                          </article>
                        ))}
                      </List>
                    </Section>
                    <Section title="Contestações">
                      <List>
                        {disputes.map((d) => (
                          <article key={String(d.id)}>
                            <p>
                              {String(d.reason)} · {String(d.status)}
                            </p>
                            {d.response && <p>{String(d.response)}</p>}
                            {admin && (
                              <Form
                                fields={[
                                  {
                                    name: "answer",
                                    label: "Resposta fundamentada à contestação",
                                    type: "textarea",
                                  },
                                ]}
                                submit={async (v) =>
                                  rpc("carla_answer_dispute", { dispute: d.id, answer: v.answer })
                                }
                              />
                            )}
                          </article>
                        ))}
                      </List>
                    </Section>
                  </>
                )}
                {admin && tab === "approvals" && (
                  <Section title="Conferência dos representantes">
                    <List>
                      {profiles.map((p) => (
                        <article key={p.id}>
                          <strong>
                            {p.name} · {p.registration}
                          </strong>
                          <p>
                            {p.status} · {p.photo_path ? "Foto enviada" : "Foto pendente"}
                          </p>
                          <p>
                            CPF {p.document} · {p.phone} · {p.address}
                          </p>
                          {p.photo_path && (
                            <button
                              onClick={async () => {
                                const r = await db.storage
                                  .from("carla-photos")
                                  .createSignedUrl(p.photo_path!, 60);
                                if (r.data)
                                  window.open(r.data.signedUrl, "_blank", "noopener,noreferrer");
                                else setError("Foto indisponível.");
                              }}
                            >
                              Conferir foto
                            </button>
                          )}
                          <Form
                            fields={[
                              {
                                name: "new_status",
                                label: "Situação",
                                options: [
                                  option("active", "Aprovar — vínculo e cadastro conferidos"),
                                  option("suspended", "Suspender"),
                                  option("ended", "Encerrar"),
                                ],
                              },
                              reason,
                            ]}
                            submit={async (d) =>
                              rpc("carla_review_profile", { profile_id: p.id, ...d })
                            }
                          />
                        </article>
                      ))}
                    </List>
                  </Section>
                )}
                {admin && tab === "finance" && (
                  <>
                    <Section title="Registrar obrigação por competência">
                      <p>
                        Discrimine receita original e incremento. A competência corresponde à ordem
                        contratual com cobrança positiva. Renovação exige participação relevante
                        comprovada; expansão exige evento próprio.
                      </p>
                      <Form
                        fields={[
                          { name: "client_id", label: "Cliente", options: clientOptions },
                          {
                            name: "kind",
                            label: "Tipo",
                            options: [
                              option("setup", "Implantação"),
                              option("monthly", "Mensalidade"),
                            ],
                          },
                          {
                            name: "competence",
                            label: "Competência contratual (1, 2, 3…)",
                            type: "number",
                          },
                          {
                            name: "due_at",
                            label: "Vencimento contratual",
                            type: "datetime-local",
                          },
                          {
                            name: "original_cents",
                            label: "Valor original em centavos",
                            type: "number",
                          },
                          {
                            name: "expansion_cents",
                            label: "Incremento em centavos (0 se não houver)",
                            type: "number",
                          },
                          {
                            name: "retention_cycle_id",
                            label: "Ciclo aplicável",
                            options: cycles.map((c) =>
                              option(
                                c.id,
                                `${clientName(c.client_id)} · ${date(c.ends_at)} · ${c.status}`,
                              ),
                            ),
                            optional: true,
                          },
                          {
                            name: "expansion_event",
                            label: "ID do evento de expansão",
                            optional: true,
                          },
                          {
                            name: "expansion_index",
                            label: "Ordem da competência ampliada",
                            type: "number",
                            optional: true,
                          },
                          {
                            name: "expansion_evidence",
                            label: "Evidência da expansão autorizada",
                            optional: true,
                          },
                          {
                            name: "renewal_event",
                            label: "ID do período renovado (só primeira competência)",
                            optional: true,
                          },
                          {
                            name: "renewal_evidence",
                            label: "Prova da renovação e participação comercial",
                            optional: true,
                          },
                        ]}
                        submit={async (d) =>
                          rpc("carla_create_invoice", {
                            payload: { ...d, due_at: timestamp(d.due_at) },
                          })
                        }
                      />
                    </Section>
                    <Section title="Ajuste de direitos anteriores / correção">
                      <p>
                        O ajuste preserva o lançamento original. Valores negativos exigem causa
                        comprovada e oportunidade de manifestação; não aplique estorno por
                        inadimplência posterior.
                      </p>
                      <Form
                        fields={[
                          {
                            name: "owner",
                            label: "Representante",
                            options: profiles.map((p) => option(p.id, p.name)),
                          },
                          {
                            name: "commission",
                            label: "Comissão relacionada (opcional)",
                            options: commissions.map((c) =>
                              option(
                                c.id,
                                `${representativeName(c.representative_id)} · ${money(c.amount_cents)}`,
                              ),
                            ),
                            optional: true,
                          },
                          { name: "cents", label: "Ajuste assinado em centavos", type: "number" },
                          reason,
                          {
                            name: "proof",
                            label: "Prova e demonstrativo do ajuste",
                            type: "textarea",
                          },
                        ]}
                        submit={async (d) =>
                          rpc("carla_record_adjustment", {
                            owner: d.owner,
                            commission: d.commission || null,
                            cents: Number(d.cents),
                            reason: d.reason,
                            proof: d.proof,
                          })
                        }
                      />
                    </Section>
                    <Section title="Conciliar recebimento">
                      <Form
                        fields={[
                          {
                            name: "invoice",
                            label: "Obrigação",
                            options: invoices.map((i) =>
                              option(
                                i.id,
                                `${clientName(i.client_id)} · ${i.kind} ${i.competence} · recebido ${money(i.received_cents)}`,
                              ),
                            ),
                          },
                          {
                            name: "cents",
                            label: "Valor efetivamente recebido em centavos",
                            type: "number",
                          },
                          { name: "reference", label: "Identificador único do crédito bancário" },
                          {
                            name: "settlement",
                            label: "Data e hora da liquidação",
                            type: "datetime-local",
                          },
                          { name: "proof", label: "Comprovante conciliado", type: "textarea" },
                        ]}
                        submit={async (d) =>
                          rpc("carla_record_receipt", {
                            ...d,
                            cents: Number(d.cents),
                            settlement: timestamp(d.settlement),
                          })
                        }
                      />
                      <p>
                        Conciliar em ordem cronológica. Não desconte custos internos, taxas de
                        recebimento ou tributos da empresa da base comissionável.
                      </p>
                    </Section>
                  </>
                )}
                {!admin && tab === "card" && profile && (
                  <Section title="Carteira digital oficial">
                    <CarlaWallet profile={profile} photo={photo} qr={qr} />
                    <button onClick={() => window.print()}>Imprimir / salvar em PDF</button>
                    <p>
                      Frente e verso: 8,5 × 5 cm cada. Na impressão, use escala de 100% e desative
                      os cabeçalhos e rodapés do navegador.
                    </p>
                    <p>
                      A verificação consulta a situação atual do representante. Uma carteira
                      impressa não comprova permanência do vínculo.
                    </p>
                  </Section>
                )}
                {tab === "materials" && (
                  <Section title="Regras comerciais e apresentação CARLA">
                    <h3>Aquisição</h3>
                    <p>
                      Primeira venda elegível do mês: 30% da implantação e 10% das três primeiras
                      competências. Segunda em diante: 35% e 15%. A faixa fica vinculada à venda
                      após o primeiro crédito.
                    </p>
                    <h3>Carteira e renovação</h3>
                    <p>
                      Retenção de 5% a partir da 4ª competência, com requisitos e protocolo
                      cumpridos. Nova venda não é requisito. Renovação assistida: 20% da primeira
                      mensalidade do novo período efetivamente recebida, com participação
                      documentada.
                    </p>
                    <h3>Expansão</h3>
                    <p>
                      20% do primeiro incremento recebido; 5% dos incrementos das competências
                      ampliadas seguintes elegíveis. Não duplicar comissão sobre o incremento com a
                      mesma finalidade.
                    </p>
                    <h3>Escopo demonstrado — Manual V4</h3>
                    <p>
                      O manual descreve atendimento por texto e áudio, consulta de escala,
                      agendamento, confirmação, métricas e integração PIX em ambiente de
                      demonstração homologado. O escopo contratado de cada cliente deve ser
                      confirmado antes da proposta. As limitações de sandbox e automações descritas
                      no manual não constituem promessa de produção.
                    </p>
                    <p>
                      Fontes: Manual Comercial V1.09, política anexa ao Contrato V1.10 e Manual de
                      Funcionalidades V4. O contrato V1.10 individual consultado não inclui
                      remuneração de coordenação ou vendas de equipe.
                    </p>
                  </Section>
                )}
              </>
            )}
          </>
        )}
      </div>
      <footer className="carla-footer">
        Oliveira Vittae Designer & IA · Governança comercial CARLA · <a href="/">Voltar ao site</a>
      </footer>
    </main>
  );
}
