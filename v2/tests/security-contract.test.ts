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
    for (const mission of publicMissions) {
      for (const variant of Object.values(mission.variants)) {
        expect(variant.expectedSignature.length).toBeGreaterThan(5);
        expect(variant.examples.length).toBeGreaterThanOrEqual(2);
      }
    }
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

  it("versions student drafts and protects staff-only solutions", () => {
    const contracts = readFileSync(
      resolve(
        "supabase/migrations/202607300001_tomatin_3_contracts.sql",
      ),
      "utf8",
    );
    const missionAdmin = readFileSync(
      resolve("supabase/functions/mission-admin/index.ts"),
      "utf8",
    );
    const judge0 = readFileSync(
      resolve("supabase/functions/_shared/judge0.ts"),
      "utf8",
    );

    expect(contracts).toContain("drafts_versioned_key");
    expect(contracts).toContain("record_student_activity");
    expect(contracts).toContain("mission_version set not null");
    expect(contracts).toContain("inline_comments");
    expect(missionAdmin).toContain('.in("role", ["owner", "mentor"])');
    expect(missionAdmin).toContain('body.action === "get-solution"');
    expect(missionAdmin).toContain('.schema("private")');
    expect(judge0).toContain(
      "Revisa los casos límite y el contrato de la misión.",
    );
    expect(judge0).not.toContain("feedback: result.passed ? undefined : match");
  });

  it("requires GitHub login and keeps repository credentials server-side", () => {
    const accessPage = readFileSync(
      resolve("v2/src/pages/AccessPage.tsx"),
      "utf8",
    );
    const authService = readFileSync(
      resolve("v2/src/services/supabase.ts"),
      "utf8",
    );
    const repositoryMigration = readFileSync(
      resolve(
        "supabase/migrations/202607250003_github_submission_repositories.sql",
      ),
      "utf8",
    );
    const repositoryService = readFileSync(
      resolve("supabase/functions/_shared/github-submissions.ts"),
      "utf8",
    );

    expect(accessPage).toContain("Continuar con GitHub");
    expect(accessPage).not.toContain("magic-email");
    expect(authService).not.toContain("signInWithOtp");
    expect(repositoryMigration).toContain(
      "GitHub authentication is required.",
    );
    expect(repositoryMigration).toContain(
      "new.github_login is distinct from old.github_login",
    );
    expect(repositoryMigration).toContain(
      "user_id = auth.uid() or is_class_staff(class_id)",
    );
    expect(repositoryService).toContain(
      'Deno.env.get("GITHUB_REPOSITORY_TOKEN")',
    );
    expect(repositoryService).toContain("private: true");
    expect(repositoryService).toContain(
      "misiones/${mission.slug}/${fileNames[input.language]}",
    );
  });
});
