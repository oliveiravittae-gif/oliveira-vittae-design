import { describe, expect, it } from "vitest";
import { pendingCounts, reaisToCents } from "@/lib/carla-operations";
import type { Commission, Cycle, Invoice, Opportunity, Profile } from "@/lib/carla";
describe("Brazilian financial input", () => {
  it.each([
    ["1.997,00", 199700],
    ["1997", 199700],
    ["0", 0],
    ["0,01", 1],
    ["10,2", 1020],
    [" R$ 2.997,99 ", 299799],
  ])("converts %s to integer cents", (value, cents) => expect(reaisToCents(value)).toBe(cents));
  it.each([
    "1.99",
    "10,123",
    "abc",
    "",
    "NaN",
    "Infinity",
    "1e3",
    "1,000.00",
    "9999999999999999999999",
  ])("rejects ambiguous or unsafe amount %s", (value) =>
    expect(() => reaisToCents(value)).toThrow(),
  );
  it("allows signed adjustments only when explicitly requested", () => {
    expect(() => reaisToCents("-25,10")).toThrow();
    expect(reaisToCents("-25,10", true)).toBe(-2510);
  });
});
describe("administrative reminders", () => {
  it("counts only eligible pending and overdue records using Brasilia calendar dates", () => {
    const now = new Date("2026-10-18T01:00:00Z"); // Still October 17 in Brasilia.
    const profiles = [{ status: "pending" }, { status: "active" }] as Profile[];
    const opportunities = [
      { status: "pending" },
      { status: "protected", protected_until: "2026-10-20T00:00:00Z" },
      { status: "protected", protected_until: "2026-10-16T00:00:00Z" },
      { status: "closed", protected_until: "2026-10-16T00:00:00Z" },
    ] as Opportunity[];
    const cycles = [
      { status: "open", ends_at: "2026-10-16T00:00:00Z" },
      { status: "fulfilled", ends_at: "2026-10-16T00:00:00Z" },
    ] as Cycle[];
    const commissions = [
      { status: "accrued", due_date: "2026-10-16" },
      { status: "accrued", due_date: "2026-10-17" },
      { status: "paid", due_date: "2026-10-16" },
    ] as Commission[];
    const invoices = [
      {
        due_at: "2026-10-16T00:00:00Z",
        original_cents: 10000,
        expansion_cents: 1000,
        received_cents: 10000,
      },
      {
        due_at: "2026-10-16T00:00:00Z",
        original_cents: 10000,
        expansion_cents: 0,
        received_cents: 10000,
      },
    ] as Invoice[];
    expect(pendingCounts(profiles, opportunities, cycles, commissions, invoices, now)).toEqual({
      profiles: 1,
      opportunities: 1,
      expiring: 1,
      expired: 1,
      retention: 1,
      commissions: 1,
      invoices: 1,
    });
    expect(commissions[0]!.status).toBe("accrued");
  });
});
