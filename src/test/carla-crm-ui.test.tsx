import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CarlaCRM } from "@/components/carla/crm";
import type { Opportunity } from "@/lib/carla";
const opportunity = {
  id: "test-opportunity",
  company: "Clínica sintética",
  contact: "Contato de teste",
  status: "pending",
  representative_id: "test-rep",
} as Opportunity;
afterEach(cleanup);
function setup(failure = false) {
  let saved: unknown[] = [];
  const rpc = vi.fn().mockImplementation(async (_name, args) => {
    if (failure)
      return {
        error: {
          message:
            "Este acompanhamento foi atualizado por outra pessoa. Atualize o CRM antes de salvar.",
        },
      };
    saved = [
      {
        opportunity_id: opportunity.id,
        stage: args.p_stage,
        next_action: args.p_next_action,
        next_action_at: args.p_next_at,
        version: 1,
      },
    ];
    return { data: saved, error: null };
  });
  const db = {
    rpc,
    from: (table: string) => {
      const q = {
        select: () => q,
        order: () => q,
        eq: () => q,
        range: async () => ({
          data: table === "carla_opportunity_pipeline" ? saved : [],
          error: null,
        }),
        single: async () => ({ data: saved[0], error: null }),
      };
      return q;
    },
  } as unknown as SupabaseClient;
  render(<CarlaCRM db={db} opportunities={[opportunity]} profiles={[]} admin={false} />);
  return rpc;
}
describe("CRM screen", () => {
  it("saves commercial follow-up through the guarded RPC without protection or financial actions", async () => {
    const rpc = setup();
    fireEvent.click(await screen.findByRole("button", { name: "Acompanhar Clínica sintética" }));
    fireEvent.change(screen.getByLabelText("Nova etapa"), { target: { value: "contacted" } });
    fireEvent.change(screen.getByLabelText("Próxima ação (obrigatória nas etapas em andamento)"), {
      target: { value: "Retornar ligação" },
    });
    fireEvent.change(screen.getByLabelText("Data e hora da próxima ação"), {
      target: { value: "2026-11-01T10:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar acompanhamento" }));
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith(
        "carla_save_pipeline",
        expect.objectContaining({
          p_opportunity: opportunity.id,
          p_stage: "contacted",
          p_next_action: "Retornar ligação",
          p_version: 0,
        }),
      ),
    );
    expect(await screen.findByText(/Proteção e comissões não foram alteradas/)).toBeInTheDocument();
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it("shows a concurrency refusal without reporting success", async () => {
    setup(true);
    fireEvent.click(await screen.findByRole("button", { name: "Acompanhar Clínica sintética" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar acompanhamento" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("outra pessoa");
    expect(screen.queryByText(/Proteção e comissões não foram alteradas/)).not.toBeInTheDocument();
  });
});
