import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchGitHubSnapshot,
  formatGitHubDate,
  normalizeGitHubSnapshot,
} from "../js/github.js";

const repository = {
  full_name: "eeminionn/tomatin-code-lab",
  html_url: "https://github.com/eeminionn/tomatin-code-lab",
  description: "Misiones universitarias",
  stargazers_count: 4,
  forks_count: 2,
  open_issues_count: 1,
  default_branch: "main",
  license: { spdx_id: "MIT" },
  updated_at: "2026-07-24T12:00:00Z",
};

const release = {
  tag_name: "v1.0.0",
  html_url:
    "https://github.com/eeminionn/tomatin-code-lab/releases/tag/v1.0.0",
  published_at: "2026-07-24T12:00:00Z",
};

test("normalizes repository and release telemetry", () => {
  assert.deepEqual(normalizeGitHubSnapshot(repository, release, "58"), {
    name: "eeminionn/tomatin-code-lab",
    url: "https://github.com/eeminionn/tomatin-code-lab",
    description: "Misiones universitarias",
    stars: 4,
    forks: 2,
    issues: 1,
    branch: "main",
    license: "MIT",
    updatedAt: "2026-07-24T12:00:00Z",
    release: {
      tag: "v1.0.0",
      url: "https://github.com/eeminionn/tomatin-code-lab/releases/tag/v1.0.0",
      publishedAt: "2026-07-24T12:00:00Z",
    },
    rateLimitRemaining: 58,
  });
});

test("accepts a repository without releases", async () => {
  const responses = [
    new Response(JSON.stringify(repository), {
      status: 200,
      headers: { "x-ratelimit-remaining": "57" },
    }),
    new Response(null, { status: 404 }),
  ];
  const snapshot = await fetchGitHubSnapshot(async () => responses.shift());

  assert.equal(snapshot.release, null);
  assert.equal(snapshot.rateLimitRemaining, 57);
});

test("reports GitHub API failures", async () => {
  const responses = [
    new Response(null, { status: 403 }),
    new Response(JSON.stringify(release), { status: 200 }),
  ];

  await assert.rejects(
    fetchGitHubSnapshot(async () => responses.shift()),
    /HTTP 403/,
  );
});

test("formats valid dates and handles missing values", () => {
  assert.match(formatGitHubDate("2026-07-24T12:00:00Z"), /2026/);
  assert.equal(formatGitHubDate("fecha-invalida"), "Sin registro");
  assert.equal(formatGitHubDate(null), "Sin registro");
});
