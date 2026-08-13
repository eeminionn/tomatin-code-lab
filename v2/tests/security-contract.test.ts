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
    const execute = readFileSync(
      resolve("supabase/functions/_shared/execute.ts"),
      "utf8",
    );
    const secureVariants = readFileSync(
      resolve("supabase/functions/_shared/secure-variants.ts"),
      "utf8",
    );
    const secureRpc = readFileSync(
      resolve(
        "supabase/migrations/202607300004_secure_variant_rpc.sql",
      ),
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
    expect(missionAdmin).not.toContain('.schema("private")');
    expect(execute).not.toContain('.schema("private")');
    expect(secureVariants).toContain(
      'admin.rpc("get_mission_variant_secure"',
    );
    expect(secureVariants).toContain(
      'admin.rpc("upsert_mission_variant_secure"',
    );
    expect(secureRpc).toContain("security definer");
    expect(secureRpc).toContain("set search_path = ''");
    expect(secureRpc).toContain("from public, anon, authenticated");
    expect(secureRpc).toContain(
      "grant select, insert, update, delete on all tables in schema public",
    );
    expect(secureRpc).toContain("to service_role");
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
    const centralRepositoryMigration = readFileSync(
      resolve(
        "supabase/migrations/202607300007_central_submission_repository.sql",
      ),
      "utf8",
    );
    const repositoryService = readFileSync(
      resolve("supabase/functions/_shared/github-submissions.ts"),
      "utf8",
    );
    const notificationService = readFileSync(
      resolve("supabase/functions/notify-assignment/index.ts"),
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
    expect(centralRepositoryMigration).toContain(
      "storage_mode in ('legacy_per_student', 'central')",
    );
    expect(centralRepositoryMigration).toContain(
      "student_repositories_class_student_path_key",
    );
    expect(repositoryService).toContain(
      'Deno.env.get("GITHUB_REPOSITORY_TOKEN")',
    );
    expect(repositoryService).toContain(
      'Deno.env.get("GITHUB_REPOSITORY_NAME")',
    );
    expect(repositoryService).toContain("private: true");
    expect(repositoryService).toContain('collaborator_status: "not_required"');
    expect(repositoryService).not.toContain("/collaborators/");
    expect(repositoryService).toContain("attempt < 3");
    expect(repositoryService).toContain("error.status !== 409");
    expect(notificationService).toContain(
      'Deno.env.get("GITHUB_NOTIFICATION_TOKEN")',
    );
    expect(notificationService).toContain("Issues: Read and write");
  });

  it("keeps fork ownership and allowed origins configurable on the server", () => {
    const ownerConfiguration = readFileSync(
      resolve("supabase/migrations/202608090001_configure_owner.sql"),
      "utf8",
    );
    const cors = readFileSync(
      resolve("supabase/functions/_shared/cors.ts"),
      "utf8",
    );

    expect(ownerConfiguration).toContain("private.app_configuration");
    expect(ownerConfiguration).toContain("owner_github_id bigint not null");
    expect(ownerConfiguration).toContain(
      "revoke all on private.app_configuration from public, anon, authenticated",
    );
    expect(ownerConfiguration).toContain(
      "when user_github_id = configured_owner_github_id then 'owner'",
    );
    expect(ownerConfiguration).not.toContain("lower(coalesce(user_login");
    expect(cors).toContain('Deno.env.get("ALLOWED_ORIGINS")');
    expect(cors).not.toContain('"Access-Control-Allow-Origin": "*"');
  });

  it("keeps frontend-only forks disconnected from production services", () => {
    const runtime = readFileSync(
      resolve("v2/src/config/runtime.ts"),
      "utf8",
    );
    const supabaseClient = readFileSync(
      resolve("v2/src/services/supabase.ts"),
      "utf8",
    );
    const runner = readFileSync(
      resolve("v2/src/services/runner.ts"),
      "utf8",
    );
    const pagesWorkflow = readFileSync(
      resolve(".github/workflows/pages.yml"),
      "utf8",
    );
    const supabaseWorkflow = readFileSync(
      resolve(".github/workflows/supabase.yml"),
      "utf8",
    );

    expect(runtime).toContain('VITE_FRONTEND_ONLY === "true"');
    expect(supabaseClient).toContain("!isFrontendOnly && url && publishableKey");
    expect(runner).toContain(
      'request.kind === "submit" || request.language === "cpp"',
    );
    expect(pagesWorkflow).toContain(
      "github.repository == 'eeminionn/tomatin-code-lab'",
    );
    expect(supabaseWorkflow).toContain(
      "github.repository == 'eeminionn/tomatin-code-lab'",
    );
  });

  it("stores profile photos privately and scopes them to class members", () => {
    const profileImages = readFileSync(
      resolve(
        "supabase/migrations/20260812184323_profile_images_and_avatar_modes.sql",
      ),
      "utf8",
    );
    const classroom = readFileSync(
      resolve("v2/src/state/classroom-context.tsx"),
      "utf8",
    );

    expect(profileImages).toContain("'profile-images'");
    expect(profileImages).toContain("false,");
    expect(profileImages).toContain("Class members read profile images");
    expect(profileImages).toContain("viewer.user_id = auth.uid()");
    expect(profileImages).toContain(
      "(storage.foldername(name))[1] = auth.uid()::text",
    );
    expect(classroom).toContain("createSignedUrls(paths, 60 * 60)");
    expect(classroom).not.toContain("getPublicUrl(profile");
  });

  it("runs frontend-only E2E through the documented root entrypoint", () => {
    const playwrightConfig = readFileSync(
      resolve("v2/playwright.config.ts"),
      "utf8",
    );

    expect(playwrightConfig).toContain(
      'const frontendOnly = process.env.VITE_FRONTEND_ONLY === "true"',
    );
    expect(playwrightConfig).toContain(
      'frontendOnly ? "pnpm frontend:dev" : "pnpm dev"',
    );
    expect(playwrightConfig).toContain('"http://127.0.0.1:4173/"');
    expect(playwrightConfig).toContain(
      '"http://127.0.0.1:4173/tomatin-code-lab/beta/"',
    );
    expect(playwrightConfig).toContain("baseURL: serverUrl");
    expect(playwrightConfig).toContain("url: serverUrl");
  });
});
