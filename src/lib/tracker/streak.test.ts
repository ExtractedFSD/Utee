import { describe, expect, it } from "vitest";
import { checkinStreak } from "./diary";

const day = (on_date: string, feeling: number | null = 3, note: string | null = null) => ({ episode_id: null, on_date, feeling, note });

describe("check-in streak", () => {
  it("counts consecutive days ending today", () => {
    const s = checkinStreak([day("2026-11-03"), day("2026-11-04"), day("2026-11-05")], "2026-11-05");
    expect(s).toEqual({ current: 3, best: 3, todayDone: true });
  });

  it("keeps the run alive until the end of today when today is not done", () => {
    const s = checkinStreak([day("2026-11-03"), day("2026-11-04")], "2026-11-05");
    expect(s).toEqual({ current: 2, best: 2, todayDone: false });
  });

  it("breaks after a missed day and remembers the best run", () => {
    const s = checkinStreak([day("2026-10-28"), day("2026-10-29"), day("2026-10-30"), day("2026-10-31"), day("2026-11-04")], "2026-11-05");
    expect(s).toEqual({ current: 1, best: 4, todayDone: false });
  });

  it("counts a note-only day but not an empty row", () => {
    expect(checkinStreak([day("2026-11-05", null, "slept badly")], "2026-11-05").current).toBe(1);
    expect(checkinStreak([day("2026-11-05", null, "  ")], "2026-11-05").current).toBe(0);
    expect(checkinStreak([], "2026-11-05")).toEqual({ current: 0, best: 0, todayDone: false });
  });
});
