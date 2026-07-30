// @vitest-environment node

import { describe, expect, it } from "vitest";
import { secureMissions } from "@/data/missions-secure";
import {
  findMissionVersion,
  type VersionedMission,
} from "@/state/catalog";

describe("mission version resolution", () => {
  const current = {
    ...secureMissions[0],
    version: 3,
    title: "Current instructions",
    isCurrent: true,
  } satisfies VersionedMission;
  const previous = {
    ...secureMissions[0],
    version: 2,
    title: "Assigned instructions",
    isCurrent: false,
  } satisfies VersionedMission;
  const catalog = [current, previous];

  it("uses the exact version assigned to the student", () => {
    expect(findMissionVersion(catalog, current.id, 2)?.title).toBe(
      "Assigned instructions",
    );
  });

  it("never substitutes current instructions for a missing assigned version", () => {
    expect(findMissionVersion(catalog, current.id, 99)).toBeUndefined();
    expect(findMissionVersion(catalog, current.id)?.version).toBe(3);
  });
});
