// @vitest-environment node

import { describe, expect, it } from "vitest";
import { edgeFunctionErrorMessage } from "@/services/runner";

describe("edge function errors", () => {
  it("uses the backend JSON error instead of the generic SDK message", async () => {
    const error = Object.assign(
      new Error("Edge Function returned a non-2xx status code"),
      {
        context: new Response(
          JSON.stringify({ error: "Tests privados no disponibles." }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          },
        ),
      },
    );

    await expect(edgeFunctionErrorMessage(error)).resolves.toBe(
      "Tests privados no disponibles.",
    );
  });

  it("keeps the SDK message when the response is not JSON", async () => {
    const error = Object.assign(
      new Error("Servicio temporalmente no disponible"),
      {
        context: new Response("upstream failure", { status: 502 }),
      },
    );

    await expect(edgeFunctionErrorMessage(error)).resolves.toBe(
      "Servicio temporalmente no disponible",
    );
  });
});
