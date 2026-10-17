import { describe, expect, it } from "vitest";
import { followUpMatches, type Pipeline } from "@/lib/carla-crm";
describe("CRM reminders", () => {
  const now = new Date("2026-10-18T01:00:00Z");
  const p = (stage: string, at: string | null) => ({ stage, next_action_at: at }) as Pipeline;
  it("uses Brasilia dates and separates closed and unplanned opportunities", () => {
    expect(followUpMatches(p("negotiation", "2026-10-18T02:00:00Z"), "today", now)).toBe(true);
    expect(followUpMatches(p("negotiation", "2026-10-18T04:00:00Z"), "today", now)).toBe(false);
    expect(followUpMatches(p("contacted", "2026-10-17T18:00:00Z"), "overdue", now)).toBe(true);
    expect(followUpMatches(p("won", null), "unplanned", now)).toBe(false);
    expect(followUpMatches(undefined, "unplanned", now)).toBe(true);
    expect(followUpMatches(p("proposal", "2026-10-20T12:00:00Z"), "week", now)).toBe(true);
  });
});
