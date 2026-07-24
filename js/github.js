const REPOSITORY_API =
  "https://api.github.com/repos/eeminionn/tomatin-code-lab";
const RELEASE_API = `${REPOSITORY_API}/releases/latest`;

function requireSuccessful(response, resource) {
  if (response.ok) return;

  const error = new Error(
    `GitHub no pudo entregar ${resource} (HTTP ${response.status}).`,
  );
  error.status = response.status;
  throw error;
}

export function normalizeGitHubSnapshot(repository, release, remaining) {
  return {
    name: repository.full_name,
    url: repository.html_url,
    description: repository.description ?? "Repositorio publico",
    stars: Number(repository.stargazers_count) || 0,
    forks: Number(repository.forks_count) || 0,
    issues: Number(repository.open_issues_count) || 0,
    branch: repository.default_branch ?? "main",
    license: repository.license?.spdx_id ?? "Sin declarar",
    updatedAt: repository.updated_at,
    release: release
      ? {
          tag: release.tag_name,
          url: release.html_url,
          publishedAt: release.published_at,
        }
      : null,
    rateLimitRemaining:
      remaining === null || remaining === undefined ? null : Number(remaining),
  };
}

export async function fetchGitHubSnapshot(fetchImplementation = fetch) {
  const [repositoryResponse, releaseResponse] = await Promise.all([
    fetchImplementation(REPOSITORY_API, {
      headers: { Accept: "application/vnd.github+json" },
    }),
    fetchImplementation(RELEASE_API, {
      headers: { Accept: "application/vnd.github+json" },
    }),
  ]);

  requireSuccessful(repositoryResponse, "el repositorio");
  if (!releaseResponse.ok && releaseResponse.status !== 404) {
    requireSuccessful(releaseResponse, "el release");
  }

  const [repository, release] = await Promise.all([
    repositoryResponse.json(),
    releaseResponse.status === 404 ? null : releaseResponse.json(),
  ]);

  return normalizeGitHubSnapshot(
    repository,
    release,
    repositoryResponse.headers.get("x-ratelimit-remaining"),
  );
}

export function formatGitHubDate(value) {
  if (!value) return "Sin registro";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin registro";

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
