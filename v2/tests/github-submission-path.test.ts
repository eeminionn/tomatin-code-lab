// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  studentSubmissionFolder,
  submissionFilePath,
} from "../../supabase/functions/_shared/github-paths";

describe("central GitHub submission paths", () => {
  it("uses a stable student folder with a collision-resistant suffix", () => {
    expect(
      studentSubmissionFolder(
        "Louu27",
        "ff7b18ec-1286-4c47-8fc5-9dbaf35664cc",
      ),
    ).toBe("louu27-ff7b18ec");
  });

  it("removes path traversal and unsupported characters", () => {
    expect(studentSubmissionFolder("../L O U", "../../ABC-123")).toBe(
      "l-o-u-abc123",
    );
  });

  it("derives the complete path without trusting a client path", () => {
    expect(
      submissionFilePath({
        githubLogin: "louu27",
        userId: "ff7b18ec-1286-4c47-8fc5-9dbaf35664cc",
        missionSlug: "../La Once de Tomatin",
        language: "python",
      }),
    ).toBe(
      "resoluciones/louu27-ff7b18ec/misiones/la-once-de-tomatin/solucion.py",
    );
  });
});
