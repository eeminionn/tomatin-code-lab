import { beforeEach, describe, expect, it } from "vitest";
import {
  createDraftKey,
  loadDraft,
  removeDraft,
  saveDraft,
} from "@/services/draft-store";
import type { Draft, Language } from "@/types";

function draft(language: Language, code: string, assignmentId = "assignment-1"): Draft {
  return {
    key: createDraftKey("student-1", "mission-1", language, assignmentId),
    userId: "student-1",
    missionId: "mission-1",
    assignmentId,
    language,
    code,
    updatedAt: new Date().toISOString(),
  };
}

beforeEach(async () => {
  await Promise.all(
    (["javascript", "python", "cpp"] as const).map((language) =>
      removeDraft(createDraftKey("student-1", "mission-1", language, "assignment-1")),
    ),
  );
});

describe("draft store", () => {
  it("keeps an independent draft for every language", async () => {
    await Promise.all([
      saveDraft(draft("javascript", "const answer = 42;")),
      saveDraft(draft("python", "answer = 42")),
      saveDraft(draft("cpp", "int answer = 42;")),
    ]);

    await expect(
      loadDraft(createDraftKey("student-1", "mission-1", "javascript", "assignment-1")),
    ).resolves.toMatchObject({ code: "const answer = 42;" });
    await expect(
      loadDraft(createDraftKey("student-1", "mission-1", "python", "assignment-1")),
    ).resolves.toMatchObject({ code: "answer = 42" });
    await expect(
      loadDraft(createDraftKey("student-1", "mission-1", "cpp", "assignment-1")),
    ).resolves.toMatchObject({ code: "int answer = 42;" });
  });

  it("does not mix practice and assigned drafts", async () => {
    const practice = draft("python", "practice", undefined);
    practice.assignmentId = undefined;
    practice.key = createDraftKey("student-1", "mission-1", "python");
    await saveDraft(practice);
    await saveDraft(draft("python", "assignment"));

    await expect(loadDraft(practice.key)).resolves.toMatchObject({ code: "practice" });
    await expect(
      loadDraft(createDraftKey("student-1", "mission-1", "python", "assignment-1")),
    ).resolves.toMatchObject({ code: "assignment" });
  });
});
