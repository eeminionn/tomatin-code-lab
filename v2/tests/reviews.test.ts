import { describe, expect, it } from "vitest";
import { createDemoSnapshot } from "@/data/demo-classroom";
import { getPendingReviews } from "@/models/reviews";

describe("pending reviews", () => {
  it("counts only submissions that the mentor can actually open", () => {
    const queue = getPendingReviews(createDemoSnapshot());

    expect(queue).toHaveLength(1);
    expect(queue[0].student.displayName).toBe("Camila Rojas");
    expect(queue[0].attempt.kind).toBe("submit");
  });

  it("ignores an awaiting state without a saved submission", () => {
    const snapshot = createDemoSnapshot();
    snapshot.attempts = [];

    expect(getPendingReviews(snapshot)).toEqual([]);
  });
});
