import { describe, expect, it } from "vitest";
import { getOAuthRedirectUrl } from "@/services/supabase";

describe("OAuth redirect", () => {
  it("returns to the application root without competing with the hash router", () => {
    expect(
      getOAuthRedirectUrl(
        "https://eeminionn.github.io/tomatin-code-lab/beta/#/auth/callback",
      ),
    ).toBe("https://eeminionn.github.io/tomatin-code-lab/beta/");
  });

  it("removes stale OAuth query and fragment values before a new login", () => {
    expect(
      getOAuthRedirectUrl(
        "https://eeminionn.github.io/tomatin-code-lab/beta/?code=old#/missions",
      ),
    ).toBe("https://eeminionn.github.io/tomatin-code-lab/beta/");
  });
});
