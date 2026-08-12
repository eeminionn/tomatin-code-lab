import { describe, expect, it } from "vitest";
import { validateProfileImage } from "@/lib/profile-image";

describe("profile image validation", () => {
  it.each(["photo.jpg", "photo.png", "photo.webp", "avatar.gif", "phone.heic"])(
    "accepts %s",
    (name) => {
      expect(() => validateProfileImage(new File(["image"], name))).not.toThrow();
    },
  );

  it("rejects unsupported files and images larger than 5 MB", () => {
    expect(() => validateProfileImage(new File(["x"], "profile.svg"))).toThrow(
      "JPG, PNG, WebP, GIF o HEIC",
    );
    expect(() =>
      validateProfileImage(
        new File([new Uint8Array(5 * 1024 * 1024 + 1)], "profile.jpg"),
      ),
    ).toThrow("5 MB");
  });
});
