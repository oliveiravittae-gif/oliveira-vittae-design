import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Opportunity, Profile } from "@/lib/carla";
import { commercialStatus } from "@/lib/carla-operations";
import {
  crmStages,
  crmTime,
  followUpMatches,
  stageLabel,
  type CrmHistory,
  type Pipeline,
} from "@/lib/carla-crm";

export function CarlaCRM({
  db,
  opportunities,
  profiles,
  admin,
}: {
  db: SupabaseClient;
  opportunities: Opportunity[];
  profiles: Profile[];
  admin: boolean;
}) {
  const [pipeline, setPipeline] = useState<Pipeline[]>([]);
  const [history, setHistory] = useState<CrmHistory[]>([]);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [search, setSearch] = useState(""),
    [stage, setStage] = useState(""),
    [owner, setOwner] = useState(""),
    [follow, setFollow] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    async function read(table: string) {
      const rows: unknown[] = [];
      for (let offset = 0; ; offset += 1000) {
        const r = await db
          .from(table)
          .select("*")
          .order(table === "carla_crm_history" ? "id" : "opportunity_id")
          .range(offset, offset + 999);
        if (r.error) throw new Error(r.error.message);
        rows.push(...r.data);
        if (r.data.length < 1000) return rows;
      }
    }
    void Promise.all([read("carla_opportunity_pipeline"), read("carla_crm_history")])
      .then(([p, h]) => {
        if (live) {
          setPipeline(p as Pipeline[]);
          setHistory(h as CrmHistory[]);
        }
      })
      .catch(() => {
        if (live)
          setError(
            "Não foi possível carregar o CRM. Tente atualizar; nenhum registro foi alterado.",
          );
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [db, reload]);
  const current = pipeline.find((p) => p.opportunity_id === selected);
  const opportunity = opportunities.find((o) => o.id === selected);
  const filtered = opportunities.filter((o) => {
    const p = pipeline.find((p) => p.opportunity_id === o.id);
    return (
      (!stage || (p?.stage ?? "prospecting") === stage) &&
      (!owner || o.representative_id === owner) &&
      `${o.company} ${o.contact}`
        .toLocaleLowerCase("pt-BR")
        .includes(search.trim().toLocaleLowerCase("pt-BR")) &&
      followUpMatches(p, follow)
    );
  });
  async function save(form: HTMLFormElement) {
    if (!opportunity) return;
    const data = new FormData(form);
    const terminal = ["won", "lost"].includes(String(data.get("stage")));
    const nextAt = String(data.get("at") ?? "");
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await db.rpc("carla_save_pipeline", {
        p_opportunity: opportunity.id,
        p_stage: String(data.get("stage")),
        p_next_action: terminal ? null : String(data.get("action") ?? "").trim(),
        p_next_at: terminal || !nextAt ? null : new Date(nextAt).toISOString(),
        p_loss_reason: String(data.get("loss") ?? "").trim() || null,
        p_notes: String(data.get("notes") ?? "").trim(),
        p_version: current?.version ?? 0,
      });
      if (r.error) throw new Error(r.error.message);
      const check = await db
        .from("carla_opportunity_pipeline")
        .select("*")
        .eq("opportunity_id", opportunity.id)
        .single();
      if (check.error || !check.data)
        throw new Error(
          "Solicitação aceita, mas a conferência falhou. Atualize o CRM antes de repetir.",
        );
      setPipeline((previous) => [
        ...previous.filter((p) => p.opportunity_id !== opportunity.id),
        check.data as Pipeline,
      ]);
      setNotice(
        `CRM de ${opportunity.company} atualizado: ${stageLabel(check.data.stage)}. Proteção e comissões não foram alteradas.`,
      );
      setReload((value) => value + 1);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível salvar. Atualize antes de tentar novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="carla-panel">
      <h2>CRM — Funil de vendas</h2>
      <p>
        Acompanhe as clínicas registradas em Oportunidades. A etapa de venda é independente da
        proteção e da formalização do cliente.
      </p>
      {notice && (
        <p className="carla-success" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="carla-message" role="alert">
          {error}
        </p>
      )}
      <button disabled={busy} onClick={() => setReload((value) => value + 1)}>
        Atualizar CRM
      </button>
      {loading ? (
        <p role="status">Carregando CRM…</p>
      ) : (
        !error && (
          <>
            <div className="carla-filters">
              <label>
                Buscar clínica ou contato
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
              </label>
              <label>
                Etapa comercial
                <select value={stage} onChange={(e) => setStage(e.target.value)}>
                  <option value="">Todas</option>
                  {crmStages.map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Acompanhamentos
                <select value={follow} onChange={(e) => setFollow(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="overdue">Atrasados</option>
                  <option value="today">Hoje (Brasília)</option>
                  <option value="week">Próximos 7 dias</option>
                  <option value="unplanned">Sem próxima ação</option>
                </select>
              </label>
              {admin && (
                <label>
                  Representante do CRM
                  <select value={owner} onChange={(e) => setOwner(e.target.value)}>
                    <option value="">Todos</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <div className="carla-crm-stages">
              {crmStages.map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={stage === id}
                  onClick={() => setStage(stage === id ? "" : id)}
                >
                  {label}{" "}
                  <strong>
                    {
                      opportunities.filter(
                        (o) =>
                          (pipeline.find((p) => p.opportunity_id === o.id)?.stage ??
                            "prospecting") === id,
                      ).length
                    }
                  </strong>
                </button>
              ))}
            </div>
            <p>
              {filtered.length} oportunidade(s) encontrada(s). Os contadores das etapas consideram
              todas as oportunidades disponíveis nesta conta.
            </p>
            <div className="carla-list">
              {filtered.map((o) => {
                const p = pipeline.find((p) => p.opportunity_id === o.id);
                return (
                  <article key={o.id}>
                    <h3>{o.company}</h3>
                    <p>{o.contact}</p>
                    <p>
                      Etapa: <strong>{stageLabel(p?.stage ?? "prospecting")}</strong> · Proteção:{" "}
                      {commercialStatus(o.status)}
                    </p>
                    {admin && (
                      <p>
                        Representante:{" "}
                        {profiles.find((rep) => rep.id === o.representative_id)?.name ??
                          "Não identificado"}
                      </p>
                    )}
                    <p>
                      Próxima ação: {p?.next_action ?? "Não definida"} ·{" "}
                      {crmTime(p?.next_action_at ?? null)}
                    </p>
                    {p?.stage === "lost" && <p>Motivo da perda: {p.loss_reason}</p>}
                    <button
                      onClick={() => {
                        setSelected(o.id);
                        setError("");
                      }}
                    >
                      Acompanhar {o.company}
                    </button>
                  </article>
                );
              })}
            </div>
            {!filtered.length && (
              <p>
                Nenhuma oportunidade neste filtro. Para iniciar uma prospecção, registre a clínica
                na aba Oportunidades.
              </p>
            )}
          </>
        )
      )}
      {opportunity && !loading && (
        <div className="carla-crm-editor" key={`${selected}:${current?.version ?? 0}`}>
          <h3>Acompanhamento: {opportunity.company}</h3>
          <p>
            Horários do formulário usam o fuso do seu dispositivo. A consulta dos agendamentos é
            exibida no horário de Brasília.
          </p>
          <form
            className="carla-form"
            onSubmit={(e) => {
              e.preventDefault();
              void save(e.currentTarget);
            }}
          >
            <label>
              Nova etapa
              <select name="stage" defaultValue={current?.stage ?? "prospecting"}>
                {crmStages.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Próxima ação (obrigatória nas etapas em andamento)
              <input name="action" maxLength={1000} defaultValue={current?.next_action ?? ""} />
            </label>
            <label>
              Data e hora da próxima ação
              <input
                type="datetime-local"
                name="at"
                defaultValue={
                  current?.next_action_at
                    ? (() => {
                        const d = new Date(current.next_action_at);
                        return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                          .toISOString()
                          .slice(0, 16);
                      })()
                    : ""
                }
              />
            </label>
            <label>
              Motivo da perda (obrigatório para Perdido)
              <textarea name="loss" maxLength={2000} defaultValue={current?.loss_reason ?? ""} />
            </label>
            <label>
              Observações comerciais
              <textarea name="notes" maxLength={4000} defaultValue={current?.notes ?? ""} />
            </label>
            <button disabled={busy}>{busy ? "Salvando…" : "Salvar acompanhamento"}</button>
          </form>
          <p>
            Ganho é uma informação comercial: contrato, ativação, proteção e comissões continuam
            sujeitos à formalização e análise próprias. Não inclua dados de pacientes ou senhas.
          </p>
          <details>
            <summary>Histórico comercial</summary>
            {history
              .filter((h) => h.opportunity_id === selected)
              .sort((a, b) => b.created_at.localeCompare(a.created_at))
              .map((h) => (
                <div className="carla-decision" key={h.id}>
                  <strong>{crmTime(h.created_at)}</strong>
                  <p>
                    {h.before_data ? stageLabel(h.before_data.stage) : "Sem acompanhamento"} →{" "}
                    {stageLabel(h.after_data.stage)}
                  </p>
                  <p>
                    Próxima ação: {h.after_data.next_action ?? "Não definida"} ·{" "}
                    {crmTime(h.after_data.next_action_at)}
                  </p>
                  <p>{h.after_data.notes}</p>
                  {h.after_data.loss_reason && <p>Motivo da perda: {h.after_data.loss_reason}</p>}
                  <small>
                    Responsável: {profiles.find((p) => p.id === h.actor)?.name ?? h.actor}
                  </small>
                </div>
              ))}
          </details>
          <button onClick={() => setSelected(null)}>Fechar acompanhamento</button>
        </div>
      )}
    </section>
  );
}
