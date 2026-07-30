import { describe, expect, it } from "vitest";
import {
  AVATAR_ACCESSORIES,
  AVATAR_SKIN_COLORS,
  defaultAvatarConfig,
  sanitizeAvatarConfig,
} from "@/lib/avatar";

describe("avatar configuration", () => {
  it("creates the same default avatar for the same student", () => {
    expect(defaultAvatarConfig("student-01")).toEqual(
      defaultAvatarConfig("student-01"),
    );
  });

  it("rejects unknown component values and colors", () => {
    const fallback = defaultAvatarConfig("student-01");
    const sanitized = sanitizeAvatarConfig(
      {
        top: "<script>",
        accessories: "round",
        skinColor: "javascript:alert(1)",
        earrings: "oversized",
      },
      "student-01",
    );

    expect(sanitized.top).toBe(fallback.top);
    expect(sanitized.accessories).toBe(AVATAR_ACCESSORIES[1][0]);
    expect(sanitized.skinColor).toBe(fallback.skinColor);
    expect(AVATAR_SKIN_COLORS).toContain(sanitized.skinColor);
    expect(sanitized.earrings).toBe("none");
  });
});
