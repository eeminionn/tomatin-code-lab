// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { publicMissions } from "@/data/missions-public.generated";

describe("security contracts", () => {
  it("does not publish hidden tests or reference solutions in the browser catalog", () => {
    const serialized = JSON.stringify(publicMissions);
    expect(serialized).not.toContain("referenceSolution");
    expect(serialized).not.toContain("hiddenTests");
    expect(serialized).not.toContain("expression\":\"hidden");
  });

  it("keeps XP idempotent and private variants inaccessible", () => {
    const migration = readFileSync(
      resolve("supabase/migrations/202607250001_tomatin_classroom.sql"),
      "utf8",
    );
    expect(migration).toContain("unique (user_id, assignment_id, reason)");
    expect(migration).toContain(
      "on conflict (user_id, assignment_id, reason) do nothing",
    );
    expect(migration).toContain(
      "revoke all on schema private from public, anon, authenticated",
    );
    expect(migration).toContain(
      "with check (user_id = auth.uid() and kind = 'run' and remote = false)",
    );
  });
});
