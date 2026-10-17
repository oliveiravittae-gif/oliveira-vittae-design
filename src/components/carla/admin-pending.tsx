import { pendingCounts } from "@/lib/carla-operations";
import type { Commission, Cycle, Invoice, Opportunity, Profile } from "@/lib/carla";

export function AdminPending({
  profiles,
  opportunities,
  cycles,
  commissions,
  invoices,
  navigate,
}: {
  profiles: Profile[];
  opportunities: Opportunity[];
  cycles: Cycle[];
  commissions: Commission[];
  invoices: Invoice[];
  navigate: (section: string) => void;
}) {
  const counts = pendingCounts(profiles, opportunities, cycles, commissions, invoices);
  return (
    <section className="carla-panel">
      <h2>Pendências da administração</h2>
      <p>
        Resumo de todos os representantes. Os alertas indicam itens para conferência; não alteram
        direitos ou situações automaticamente.
      </p>
      <div className="carla-pending-grid">
        {(
          [
            ["Cadastros aguardando análise", counts.profiles, "approvals"],
            ["Oportunidades aguardando análise", counts.opportunities, "opportunities"],
            ["Proteções vencendo em até 7 dias", counts.expiring, "opportunities"],
            ["Proteções com prazo ultrapassado", counts.expired, "opportunities"],
            ["Retenções com prazo ultrapassado", counts.retention, "retention"],
            ["Comissões a pagar vencidas", counts.commissions, "commissions"],
            ["Obrigações vencidas com saldo", counts.invoices, "finance"],
          ] as const
        ).map(([label, count, section]) => (
          <button key={label} onClick={() => navigate(section)}>
            <span>{label}</span>
            <strong>{count}</strong>
            <span>Abrir seção →</span>
          </button>
        ))}
      </div>
      <p>
        O alerta de 7 dias é um lembrete operacional. Use as evidências e regras contratuais na
        análise de cada caso.
      </p>
    </section>
  );
}
