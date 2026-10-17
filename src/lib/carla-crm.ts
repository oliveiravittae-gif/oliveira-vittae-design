export const crmStages = [
  ["prospecting", "Prospecção"],
  ["contacted", "Contato realizado"],
  ["diagnosis", "Diagnóstico"],
  ["demo", "Demonstração"],
  ["proposal", "Proposta"],
  ["negotiation", "Negociação"],
  ["won", "Ganho"],
  ["lost", "Perdido"],
] as const;
export type CrmStage = (typeof crmStages)[number][0];
export type Pipeline = {
  opportunity_id: string;
  stage: CrmStage;
  next_action: string | null;
  next_action_at: string | null;
  loss_reason: string | null;
  notes: string;
  version: number;
  updated_at: string;
  updated_by: string;
};
export type CrmHistory = {
  id: string;
  opportunity_id: string;
  before_data: Pipeline | null;
  after_data: Pipeline;
  actor: string;
  created_at: string;
};
export const stageLabel = (stage: string) => crmStages.find(([id]) => id === stage)?.[1] ?? stage;
export const crmTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
    : "Não agendado";
export function followUpMatches(p: Pipeline | undefined, filter: string, now = new Date()) {
  if (!filter) return true;
  if (p && ["won", "lost"].includes(p.stage)) return false;
  if (!p?.next_action_at) return filter === "unplanned";
  const at = new Date(p.next_action_at);
  if (filter === "overdue") return at < now;
  if (filter === "today")
    return (
      at.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }) ===
      now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
    );
  return filter === "week" && at >= now && at.getTime() <= now.getTime() + 7 * 86400000;
}
