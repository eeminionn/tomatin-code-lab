import { describe, expect, it } from "vitest";
import { createDemoSnapshot } from "@/data/demo-classroom";
import {
  availableXpForStudent,
  earnedXpForStudent,
  spentXpForStudent,
} from "@/models/rewards";
import type { ClassroomSnapshot } from "@/types";

describe("reward balances", () => {
  it("keeps earned ranking XP separate from active redemptions", () => {
    const snapshot: ClassroomSnapshot = {
      ...createDemoSnapshot(),
      rewardRedemptions: [],
    };
    const userId = "student-02";
    snapshot.rewardRedemptions.push({
      id: "redemption-test",
      rewardId: "reward-hint",
      classId: snapshot.classroom.id,
      userId,
      rewardTitle: "Pista extra",
      costXp: 40,
      status: "requested",
      createdAt: new Date().toISOString(),
    });

    expect(earnedXpForStudent(snapshot, userId)).toBe(100);
    expect(spentXpForStudent(snapshot, userId)).toBe(40);
    expect(availableXpForStudent(snapshot, userId)).toBe(60);
  });

  it("restores available XP when a redemption is cancelled", () => {
    const snapshot: ClassroomSnapshot = {
      ...createDemoSnapshot(),
      rewardRedemptions: [],
    };
    const userId = "student-02";
    snapshot.rewardRedemptions.push({
      id: "redemption-cancelled",
      classId: snapshot.classroom.id,
      userId,
      rewardTitle: "Premio cancelado",
      costXp: 100,
      status: "cancelled",
      createdAt: new Date().toISOString(),
      cancelledAt: new Date().toISOString(),
    });

    expect(spentXpForStudent(snapshot, userId)).toBe(0);
    expect(availableXpForStudent(snapshot, userId)).toBe(100);
  });
});
