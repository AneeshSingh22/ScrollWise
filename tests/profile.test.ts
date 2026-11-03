import { describe, expect, it } from "vitest";
import { merge } from "@/lib/profile";
import { EMPTY, type Persisted } from "@/lib/store";

function p(over: Partial<Persisted>): Persisted {
  return { ...EMPTY, ...over };
}

/**
 * The merge runs once per sign-in and decides whether offline progress
 * survives. Getting it wrong silently deletes someone's XP, so it is tested
 * harder than its size suggests.
 */
describe("merge", () => {
  it("keeps the higher XP, whichever side it is on", () => {
    expect(merge(p({ xp: 500 }), p({ xp: 120 })).xp).toBe(500);
    expect(merge(p({ xp: 120 }), p({ xp: 500 })).xp).toBe(500);
  });

  it("keeps the longer streak", () => {
    expect(merge(p({ streak: 9 }), p({ streak: 3 })).streak).toBe(9);
    expect(merge(p({ streak: 3 }), p({ streak: 9 })).streak).toBe(9);
  });

  it("keeps the later last-active day", () => {
    const local = p({ lastDay: "2026-03-05" });
    const remote = p({ lastDay: "2026-02-28" });
    expect(merge(local, remote).lastDay).toBe("2026-03-05");
    expect(merge(remote, local).lastDay).toBe("2026-03-05");
  });

  it("unions saved cards from both sides", () => {
    const got = merge(p({ saved: ["a", "b"] }), p({ saved: ["b", "c"] }));
    expect([...got.saved].sort()).toEqual(["a", "b", "c"]);
  });

  it("never duplicates an id present on both sides", () => {
    const got = merge(p({ saved: ["x"] }), p({ saved: ["x"] }));
    expect(got.saved).toEqual(["x"]);
  });

  it("unions liked and fewer too", () => {
    const got = merge(
      p({ liked: ["l1"], fewer: ["ai"] }),
      p({ liked: ["l2"], fewer: ["math"] }),
    );
    expect([...got.liked].sort()).toEqual(["l1", "l2"]);
    expect([...got.fewer].sort()).toEqual(["ai", "math"]);
  });

  it("loses nothing when the remote profile is brand new", () => {
    const local = p({
      xp: 340,
      streak: 6,
      lastDay: "2026-03-05",
      saved: ["a", "b"],
      liked: ["a"],
      fewer: ["world"],
    });
    expect(merge(local, EMPTY)).toEqual(local);
  });

  it("loses nothing when the device is brand new", () => {
    const remote = p({
      xp: 900,
      streak: 12,
      lastDay: "2026-03-04",
      saved: ["x"],
    });
    const got = merge(EMPTY, remote);
    expect(got.xp).toBe(900);
    expect(got.streak).toBe(12);
    expect(got.saved).toEqual(["x"]);
  });

  it("is idempotent — merging twice changes nothing", () => {
    const local = p({ xp: 100, saved: ["a"], streak: 2, lastDay: "2026-03-01" });
    const remote = p({ xp: 250, saved: ["b"], streak: 5, lastDay: "2026-03-03" });
    const once = merge(local, remote);
    expect(merge(once, remote)).toEqual(once);
    expect(merge(local, once)).toEqual(once);
  });

  it("does not mutate either input", () => {
    const local = p({ xp: 10, saved: ["a"] });
    const remote = p({ xp: 20, saved: ["b"] });
    const localCopy = structuredClone(local);
    const remoteCopy = structuredClone(remote);
    merge(local, remote);
    expect(local).toEqual(localCopy);
    expect(remote).toEqual(remoteCopy);
  });

  it("an empty day string never beats a real one", () => {
    expect(merge(p({ lastDay: "" }), p({ lastDay: "2026-03-05" })).lastDay).toBe(
      "2026-03-05",
    );
    expect(merge(p({ lastDay: "2026-03-05" }), p({ lastDay: "" })).lastDay).toBe(
      "2026-03-05",
    );
  });
});
