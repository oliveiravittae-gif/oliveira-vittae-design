import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/carla";

type Decision = {
  id: string;
  record_id: string;
  reason: string;
  actor: string;
  created_at: string;
};
export const profileStatus = (status: string) =>
  ({ pending: "Aguardando análise", active: "Ativo", suspended: "Suspenso", ended: "Encerrado" })[
    status
  ] ?? status;
const time = (value: string) =>
  new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

export function RepresentativesAdmin({
  db,
  profiles,
  onUpdated,
  onNotice,
}: {
  db: SupabaseClient;
  profiles: Profile[];
  onUpdated: (profiles: Profile[]) => void;
  onNotice: (message: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("pending");
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    let live = true;
    void (async () => {
      const rows: Decision[] = [];
      for (let offset = 0; ; offset += 1000) {
        const result = await db
          .from("carla_decisions")
          .select("id,record_id,reason,actor,created_at")
          .eq("entity", "profile")
          .order("created_at", { ascending: false })
          .order("id")
          .range(offset, offset + 999);
        if (!live) return;
        if (result.error) {
          setHistoryError("Não foi possível carregar o histórico de decisões.");
          break;
        }
        rows.push(...result.data);
        if (result.data.length < 1000) {
          setDecisions(rows);
          break;
        }
      }
      if (live) setHistoryLoading(false);
    })().catch(() => {
      if (live) {
        setHistoryError("Não foi possível carregar o histórico de decisões.");
        setHistoryLoading(false);
      }
    });
    return () => {
      live = false;
    };
  }, [db]);

  async function review(profile: Profile, next: string, reason: string) {
    if (reason.trim().length < 10) {
      setError("Informe uma justificativa com pelo menos 10 caracteres.");
      return;
    }
    if (
      !window.confirm(
        `${next === "active" ? "Liberar o acesso de" : `Alterar a situação para ${profileStatus(next)} de`} ${profile.name} (${profile.registration})?`,
      )
    )
      return;
    setBusy(profile.id);
    setError("");
    onNotice("");
    let saved = false;
    try {
      const result = await db.rpc("carla_review_profile", {
        profile_id: profile.id,
        new_status: next,
        reason: reason.trim(),
      });
      if (result.error) throw new Error(result.error.message);
      saved = true;
      const verified = await db.from("carla_profiles").select("*").eq("id", profile.id).single();
      if (verified.error || verified.data?.status !== next)
        throw new Error(
          "A situação atual ainda não pôde ser confirmada. Atualize a página antes de tentar novamente.",
        );
      onUpdated(profiles.map((p) => (p.id === profile.id ? (verified.data as Profile) : p)));
      const audit = await db
        .from("carla_decisions")
        .select("id,record_id,reason,actor,created_at")
        .eq("entity", "profile")
        .eq("record_id", profile.id)
        .order("created_at", { ascending: false })
        .order("id")
        .limit(1)
        .single();
      const action =
        next === "active" ? "Acesso liberado" : `Situação alterada para ${profileStatus(next)}`;
      onNotice(
        `${action}: ${profile.name} · ${profile.registration}. Situação confirmada no sistema.${audit.data ? ` Registrado em ${time(audit.data.created_at)} (Brasília).` : ""}`,
      );
      if (audit.error)
        setHistoryError(
          "A situação foi confirmada, mas o histórico não pôde ser atualizado. Atualize a página para consultar a decisão.",
        );
      else {
        setDecisions((previous) => [audit.data, ...previous.filter((d) => d.id !== audit.data.id)]);
      }
    } catch (e) {
      setError(
        `${saved ? "A solicitação foi aceita, mas a conferência não foi concluída. " : ""}${e instanceof Error ? e.message : "Falha de conexão. Confira a situação antes de repetir."}`,
      );
    } finally {
      setBusy(null);
    }
  }

  const normalized = search.trim().toLocaleLowerCase("pt-BR");
  const visible = profiles.filter(
    (p) =>
      (!status || p.status === status) &&
      `${p.name} ${p.registration}`.toLocaleLowerCase("pt-BR").includes(normalized),
  );
  return (
    <section className="carla-panel">
      <h2>Representantes e aprovações</h2>
      <p>Confira o vínculo formalizado, os dados e a foto antes de liberar o acesso.</p>
      <div className="carla-filters">
        <label>
          Buscar por nome ou matrícula
          <input value={search} onChange={(e) => setSearch(e.target.value)} type="search" />
        </label>
        <label>
          Situação do cadastro
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos ({profiles.length})</option>
            {["pending", "active", "suspended", "ended"].map((s) => (
              <option key={s} value={s}>
                {profileStatus(s)} ({profiles.filter((p) => p.status === s).length})
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p className="carla-message" role="alert">
          {error}
        </p>
      )}
      {historyError && <p role="alert">{historyError}</p>}
      {historyLoading && <p role="status">Carregando histórico…</p>}
      <p>{visible.length} representante(s) encontrado(s).</p>
      <div className="carla-list">
        {visible.map((p) => (
          <article key={p.id}>
            <h3>{p.name}</h3>
            <p>
              {p.registration} · <strong>{profileStatus(p.status)}</strong>
            </p>
            <p>
              {p.photo_path ? "Foto enviada" : "Foto pendente"} · CPF ***.***.***-
              {p.document.slice(-2)}
            </p>
            <details>
              <summary>Dados do cadastro</summary>
              <p>Telefone: {p.phone}</p>
              <p>Endereço: {p.address}</p>
              <p>CPF: {p.document}</p>
            </details>
            {p.photo_path && (
              <button
                type="button"
                onClick={async () => {
                  const result = await db.storage
                    .from("carla-photos")
                    .createSignedUrl(p.photo_path!, 60);
                  if (result.error || !result.data) {
                    setError("Não foi possível abrir a foto. Tente novamente.");
                    return;
                  }
                  window.open(result.data.signedUrl, "_blank", "noopener,noreferrer");
                }}
              >
                Conferir foto
              </button>
            )}
            <form
              className="carla-form"
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                void review(p, String(data.get("status")), String(data.get("reason")));
              }}
            >
              <label>
                Ação para {p.name}
                <select name="status" required defaultValue="">
                  <option value="">Selecione uma ação</option>
                  {p.status !== "active" && (
                    <option value="active" disabled={!p.photo_path}>
                      Aprovar e liberar acesso
                    </option>
                  )}
                  {p.status !== "suspended" && <option value="suspended">Suspender acesso</option>}
                  {p.status !== "ended" && <option value="ended">Encerrar vínculo</option>}
                </select>
              </label>
              <label>
                Justificativa para {p.name}
                <textarea name="reason" minLength={10} maxLength={4000} required />
              </label>
              <button disabled={busy !== null}>
                {busy === p.id ? "Conferindo gravação…" : "Confirmar alteração"}
              </button>
            </form>
            {!p.photo_path && <p>Envio de foto obrigatório para aprovação.</p>}
            <details>
              <summary>Histórico de decisões</summary>
              {decisions
                .filter((d) => d.record_id === p.id)
                .map((d) => (
                  <div className="carla-decision" key={d.id}>
                    <p>
                      <strong>{time(d.created_at)} (Brasília)</strong>
                    </p>
                    <p>{d.reason}</p>
                    <p>
                      Responsável:{" "}
                      {profiles.find((p) => p.id === d.actor)?.name ?? "Conta administrativa"}
                    </p>
                    <small>Identificador do responsável: {d.actor}</small>
                  </div>
                ))}
              {!historyLoading && !historyError && !decisions.some((d) => d.record_id === p.id) && (
                <p>Nenhuma decisão administrativa registrada.</p>
              )}
            </details>
          </article>
        ))}
      </div>
      {!visible.length && (
        <p>Nenhum representante neste filtro. Selecione outra situação para consultar os demais.</p>
      )}
    </section>
  );
}
