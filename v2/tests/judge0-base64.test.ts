// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  decodeUtf8Base64,
  encodeUtf8Base64,
} from "../../supabase/functions/_shared/base64";

describe("Judge0 UTF-8 transport", () => {
  it("preserves accents, ñ and emoji through Base64", () => {
    const source = [
      "// Misión: calcula el total de Tomatín 🍅",
      'const feedback = "Revisa la posición y la multiplicación.";',
    ].join("\n");

    expect(decodeUtf8Base64(encodeUtf8Base64(source))).toBe(source);
  });

  it("preserves empty and null provider fields", () => {
    expect(decodeUtf8Base64(encodeUtf8Base64(""))).toBe("");
    expect(decodeUtf8Base64(null)).toBeNull();
  });
});
