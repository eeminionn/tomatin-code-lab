import { describe, expect, it } from "vitest";
import {
  AVATAR_ACCESSORIES,
  AVATAR_SKIN_COLORS,
  defaultAvatarConfig,
  MINI_BODY_COLORS,
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

  it("keeps safe Mini options and rejects arbitrary SVG values", () => {
    const sanitized = sanitizeAvatarConfig(
      {
        style: "mini",
        miniBody: "bean",
        miniEyes: "wink",
        miniBodyColor: MINI_BODY_COLORS[1],
        miniAccessory: "<script>",
      },
      "student-mini",
    );

    expect(sanitized.style).toBe("mini");
    expect(sanitized.miniBody).toBe("bean");
    expect(sanitized.miniEyes).toBe("wink");
    expect(sanitized.miniBodyColor).toBe(MINI_BODY_COLORS[1]);
    expect(sanitized.miniAccessory).not.toBe("<script>");
  });
});
