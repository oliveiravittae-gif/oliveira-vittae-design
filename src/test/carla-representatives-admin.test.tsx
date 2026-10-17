import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RepresentativesAdmin } from "@/components/carla/representatives-admin";
import type { Profile } from "@/lib/carla";
const profile: Profile = {
  id: "test-profile",
  name: "Pessoa Sintética",
  registration: "CLR-2026-TESTE",
  document: "00000000000",
  address: "Endereço sintético",
  phone: "00000000000",
  status: "pending",
  photo_path: "test/photo.jpeg",
  card_token: "test-token",
};
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function setup(verifiedStatus = "active", rpcError: string | null = null) {
  const decision = {
    id: "decision",
    record_id: profile.id,
    reason: "Conferência sintética autorizada",
    actor: "admin-test",
    created_at: "2026-10-17T18:00:00Z",
  };
  const rpc = vi.fn().mockResolvedValue({ error: rpcError ? { message: rpcError } : null });
  const db = {
    rpc,
    from: (table: string) => {
      const q = {
        select: () => q,
        eq: () => q,
        order: () => q,
        limit: () => q,
        range: async () => ({ data: [], error: null }),
        single: async () => ({
          data: table === "carla_profiles" ? { ...profile, status: verifiedStatus } : decision,
          error: null,
        }),
      };
      return q;
    },
  } as unknown as SupabaseClient;
  const onNotice = vi.fn(),
    onUpdated = vi.fn();
  render(
    <RepresentativesAdmin
      db={db}
      profiles={[profile, { ...profile, id: "other", name: "Outra Pessoa", status: "active" }]}
      onUpdated={onUpdated}
      onNotice={onNotice}
    />,
  );
  return { rpc, onNotice, onUpdated };
}
async function approve() {
  await screen.findByText("1 representante(s) encontrado(s).");
  fireEvent.change(screen.getByLabelText("Ação para Pessoa Sintética"), {
    target: { value: "active" },
  });
  fireEvent.change(screen.getByLabelText("Justificativa para Pessoa Sintética"), {
    target: { value: "Dados e vínculo conferidos para teste" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Confirmar alteração" }));
}
describe("admin representative decisions", () => {
  it("filters by status and searches names without exposing full CPF by default", async () => {
    setup();
    expect(await screen.findByText("1 representante(s) encontrado(s).")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Outra Pessoa" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Situação do cadastro"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Buscar por nome ou matrícula"), {
      target: { value: "outra" },
    });
    expect(screen.getByRole("heading", { name: "Outra Pessoa" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Pessoa Sintética" })).not.toBeInTheDocument();
  });
  it("does not submit a cancelled confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const { rpc } = setup();
    await approve();
    expect(rpc).not.toHaveBeenCalled();
  });
  it("confirms success only after reading the saved status", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { onNotice, onUpdated } = setup();
    await approve();
    await waitFor(() =>
      expect(onNotice).toHaveBeenCalledWith(expect.stringContaining("Acesso liberado")),
    );
    expect(onUpdated).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: profile.id, status: "active" })]),
    );
  });
  it("does not claim approval when read-back remains pending", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { onNotice, onUpdated } = setup("pending");
    await approve();
    expect(await screen.findByRole("alert")).toHaveTextContent("conferência não foi concluída");
    expect(onUpdated).not.toHaveBeenCalled();
    expect(onNotice).not.toHaveBeenCalledWith(expect.stringContaining("Acesso liberado"));
  });
  it("shows server refusal without changing the profile", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { onUpdated } = setup("active", "Foto obrigatória antes da aprovação");
    await approve();
    expect(await screen.findByRole("alert")).toHaveTextContent("Foto obrigatória");
    expect(onUpdated).not.toHaveBeenCalled();
  });
});
