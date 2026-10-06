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
  function sessionClient(admin: boolean, failed = false) {
    let callback: (event: string, session: { user: { id: string; email: string } } | null) => void;
    const email = admin ? "admin@example.invalid" : "demo@example.invalid";
    const query = {
      select: () => query,
      eq: () => query,
      order: () => query,
      range: async () => ({ data: [], error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolve),
    };
    const signOut = vi.fn().mockImplementation(async () => {
      callback("SIGNED_OUT", null);
      return { error: null };
    });
    mock.client.mockReturnValue({
      from: () => query,
      rpc: async () => ({
        data: failed ? null : admin,
        error: failed ? { message: "Falha de rede sintética" } : null,
      }),
      auth: {
        signOut,
        onAuthStateChange: (listener: typeof callback) => {
          callback = listener;
          callback("INITIAL_SESSION", { user: { id: "synthetic-user", email } });
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        },
      },
    });
    return signOut;
  }
  it("identifies a representative session and offers switching accounts without granting admin", async () => {
    const signOut = sessionClient(false);
    render(<CarlaPortal admin />);
    expect(await screen.findByRole("heading", { name: "Acesso restrito" })).toBeInTheDocument();
    expect(screen.getByText("Conta: demo@example.invalid")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Entrar com outra conta" }));
    expect(await screen.findByRole("heading", { name: "Acesse sua área" })).toBeInTheDocument();
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });
  it("does not misreport a request failure as denied administrative permission", async () => {
    sessionClient(true, true);
    render(<CarlaPortal admin />);
    expect(
      await screen.findByRole("heading", { name: "Não foi possível verificar seu acesso" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Acesso restrito" })).not.toBeInTheDocument();
  });
  it("opens the dashboard when server-side administrative permission is true", async () => {
    sessionClient(true);
    render(<CarlaPortal admin />);
    expect(await screen.findByRole("button", { name: "Aprovações" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Acesso restrito" })).not.toBeInTheDocument();
  });
  it("lets a recovered session define a password without a representative profile", async () => {
    const updateUser = vi.fn().mockResolvedValue({ error: null });
    const query = {
      select: () => query,
      eq: () => query,
      maybeSingle: async () => ({ data: null, error: null }),
    };
    mock.client.mockReturnValue({
      from: () => query,
      rpc: async () => ({ data: true, error: null }),
      auth: {
        updateUser,
        onAuthStateChange: (
          callback: (event: string, session: { user: { id: string } }) => void,
        ) => {
          callback("INITIAL_SESSION", { user: { id: "synthetic-admin" } });
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        },
      },
    });
    render(<CarlaPortal />);
    expect(
      await screen.findByText("Seu usuário não possui cadastro de representante CARLA."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Definir senha" }));
    expect(screen.getByRole("heading", { name: "Definir nova senha" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nova senha (mínimo 12 caracteres)"), {
      target: { value: "synthetic-password-only" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Atualizar senha" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Senha definida.");
    expect(updateUser).toHaveBeenCalledWith({ password: "synthetic-password-only" });
  });
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
      "CPF (11 dígitos)",
      "Endereço completo, número, bairro, cidade, UF e CEP",
      "Celular com DDD",
      "E-mail",
      "Senha (mínimo 12 caracteres)",
    ]) {
      expect(screen.getByLabelText(name)).toBeRequired();
    }
    expect(screen.getByText(/A foto é obrigatória na próxima etapa/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Matrícula informada pela empresa")).not.toBeInTheDocument();
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
