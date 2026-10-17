import type { Commission, Cycle, Invoice, Opportunity, Profile } from "./carla";

// Financial inputs use the Brazilian decimal separator; ambiguous decimals are rejected.
export function reaisToCents(input: string, signed = false): number {
  const value = input.trim().replace(/^R\$\s*/, "");
  if (!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(value))
    throw new Error("Informe o valor em reais: 1.997,00. Use vírgula para os centavos.");
  const negative = value.startsWith("-");
  if (negative && !signed) throw new Error("Este valor não pode ser negativo.");
  const [whole, fraction = ""] = value.replace(/^-/, "").replaceAll(".", "").split(",");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) throw new Error("Valor fora do limite permitido.");
  return negative ? -cents : cents;
}

export const commercialStatus = (value: string) =>
  ({
    pending: "Aguardando análise",
    protected: "Protegida",
    rejected: "Recusado / não cumprido",
    closed: "Concluído",
    active: "Ativo",
    cancelled: "Cancelado",
    open: "Em andamento",
    submitted: "Aguardando conferência",
    fulfilled: "Protocolo cumprido",
    exception: "Impedimento reconhecido",
    accrued: "A pagar",
    paid: "Pago",
    suspended: "Suspenso",
    ended: "Encerrado",
  })[value] ?? value;

export function pendingCounts(
  profiles: Profile[],
  opportunities: Opportunity[],
  cycles: Cycle[],
  commissions: Commission[],
  invoices: Invoice[],
  now = new Date(),
) {
  const today = now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  return {
    profiles: profiles.filter((p) => p.status === "pending").length,
    opportunities: opportunities.filter((o) => o.status === "pending").length,
    expiring: opportunities.filter(
      (o) =>
        o.status === "protected" &&
        o.protected_until &&
        new Date(o.protected_until).getTime() >= now.getTime() &&
        new Date(o.protected_until).getTime() <= now.getTime() + 7 * 86400000,
    ).length,
    expired: opportunities.filter(
      (o) =>
        o.status === "protected" &&
        o.protected_until &&
        new Date(o.protected_until).getTime() < now.getTime(),
    ).length,
    retention: cycles.filter(
      (c) =>
        ["open", "submitted", "rejected"].includes(c.status) &&
        new Date(c.ends_at).getTime() < now.getTime(),
    ).length,
    commissions: commissions.filter((c) => c.status === "accrued" && c.due_date < today).length,
    invoices: invoices.filter(
      (i) =>
        new Date(i.due_at).getTime() < now.getTime() &&
        i.received_cents < i.original_cents + i.expansion_cents,
    ).length,
  };
}
