import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CarlaPortal } from "@/components/carla/portal";
const mock = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/lib/carla", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  carlaClient: mock.client,
}));
afterEach(cleanup);
describe("CARLA access screens", () => {
  it("fails closed when Supabase configuration is absent", () => {
    mock.client.mockReturnValue(null);
    render(<CarlaPortal />);
    expect(screen.getByText("Conexão pendente")).toBeInTheDocument();
    expect(screen.queryByText("Comissões a pagar")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar ao site" })).toHaveAttribute("href", "/");
  });
  it("shows secure login and complete mandatory application before approval", async () => {
    mock.client.mockReturnValue({
      auth: {
        onAuthStateChange: (callback: (event: string, session: null) => void) => {
          callback("INITIAL_SESSION", null);
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        },
      },
    });
    render(<CarlaPortal />);
    expect(await screen.findByRole("heading", { name: "Acesse sua área" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Novo cadastro" }));
    for (const name of [
      "Nome completo",
      "Matrícula informada pela empresa",
      "CPF (11 dígitos)",
      "Endereço completo, número, bairro, cidade, UF e CEP",
      "Celular com DDD",
      "E-mail",
      "Senha (mínimo 12 caracteres)",
    ]) {
      expect(screen.getByLabelText(name)).toBeRequired();
    }
    expect(screen.getByText(/A foto é obrigatória na próxima etapa/)).toBeInTheDocument();
  });
  it("does not offer representative self-registration in administration", async () => {
    mock.client.mockReturnValue({
      auth: {
        onAuthStateChange: (callback: (event: string, session: null) => void) => {
          callback("INITIAL_SESSION", null);
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        },
      },
    });
    render(<CarlaPortal admin />);
    expect(await screen.findByRole("heading", { name: "Administração CARLA" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Novo cadastro" })).not.toBeInTheDocument();
  });
});
