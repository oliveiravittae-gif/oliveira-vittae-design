import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;
export function carlaClient() {
  const url = import.meta.env["VITE_SUPABASE_URL"];
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;
  client ??= createClient(url, key, {
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          signal: init?.signal
            ? AbortSignal.any([init.signal, AbortSignal.timeout(15000)])
            : AbortSignal.timeout(15000),
        }),
    },
  });
  return client;
}

export function validCPF(input: string) {
  const cpf = input.replace(/\D/g, "");
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  return [9, 10].every((length) => {
    const sum = [...cpf.slice(0, length)].reduce((s, n, i) => s + Number(n) * (length + 1 - i), 0);
    const digit = (sum * 10) % 11;
    return Number(cpf[length]) === (digit === 10 ? 0 : digit);
  });
}

export const money = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const date = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—";

export type Profile = {
  id: string;
  name: string;
  registration: string;
  document: string;
  address: string;
  phone: string;
  status: string;
  photo_path: string | null;
  card_token: string;
};
export type Client = {
  id: string;
  name: string;
  representative_id: string;
  status: string;
  activated_at: string;
  contract_ref: string;
  tier: number | null;
};
export type Opportunity = {
  id: string;
  company: string;
  contact: string;
  channel: string;
  evidence: string;
  status: string;
  protected_until: string | null;
  representative_id: string;
  created_at: string;
  sequence: number;
  decision_reason: string | null;
};
export type Cycle = {
  id: string;
  client_id: string;
  representative_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  decision_reason: string | null;
};
export type Invoice = {
  id: string;
  client_id: string;
  representative_id: string;
  competence: number;
  kind: string;
  original_cents: number;
  expansion_cents: number;
  received_cents: number;
  due_at: string;
  retention_cycle_id: string | null;
  renewal_evidence: string | null;
  expansion_index: number | null;
};
export type Commission = {
  id: string;
  representative_id: string;
  invoice_id: string;
  amount_cents: number;
  kind: string;
  status: string;
  receipt_id: string;
  created_at: string;
  due_date: string;
};
