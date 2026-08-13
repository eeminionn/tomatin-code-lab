import { useEffect, useState } from "react";
import {
  ExternalLink,
  GitBranch,
  Github,
  Radio,
  Scale,
  Star,
} from "lucide-react";
import { useClassroom } from "@/state/classroom-context";

interface RepositoryInfo {
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
  license?: { spdx_id: string };
}

export function Component() {
  const { backendMode, frontendOnly } = useClassroom();
  const [repository, setRepository] = useState<RepositoryInfo | null>(null);

  useEffect(() => {
    if (frontendOnly) return;
    fetch("https://api.github.com/repos/eeminionn/tomatin-code-lab")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then(setRepository)
      .catch(() => setRepository(null));
  }, [frontendOnly]);

  return (
    <main className="page about-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">PROYECTO ABIERTO</p>
          <h1>Tomatin Code Lab</h1>
          <p>
            Un espacio para aprender programación, recibir feedback y avanzar en clase.
          </p>
        </div>
        <a
          className="button secondary"
          href="https://github.com/eeminionn/tomatin-code-lab"
          target="_blank"
          rel="noreferrer"
        >
          <Github aria-hidden="true" />
          Repositorio
          <ExternalLink aria-hidden="true" />
        </a>
      </header>

      <section className="about-status">
        <div>
          <Radio aria-hidden="true" />
          <span>
            <strong>
              {frontendOnly
                ? "Sandbox de frontend"
                : backendMode === "supabase"
                  ? "Aula conectada"
                  : "Modo de demostración"}
            </strong>
            <small>
              {frontendOnly
                ? "Sin conexiones a servicios externos"
                : backendMode === "supabase"
                ? "Datos sincronizados con Supabase"
                : "Los datos se guardan solo en este navegador"}
            </small>
          </span>
        </div>
        <span className={`api-pill ${backendMode}`}>
          {backendMode === "supabase" ? "ONLINE" : "LOCAL"}
        </span>
      </section>

      <section className="repository-metrics" aria-label="Estado del repositorio">
        <article>
          <Star aria-hidden="true" />
          <span>Estrellas</span>
          <strong>{repository?.stargazers_count ?? "—"}</strong>
        </article>
        <article>
          <GitBranch aria-hidden="true" />
          <span>Forks</span>
          <strong>{repository?.forks_count ?? "—"}</strong>
        </article>
        <article>
          <Github aria-hidden="true" />
          <span>Issues + PR</span>
          <strong>{repository?.open_issues_count ?? "—"}</strong>
        </article>
        <article>
          <Scale aria-hidden="true" />
          <span>Licencia</span>
          <strong>{repository?.license?.spdx_id ?? "MIT"}</strong>
        </article>
      </section>

      <section className="architecture-band">
        <div>
          <span>FRONTEND</span>
          <strong>React · TypeScript · Vite</strong>
        </div>
        <div>
          <span>EJECUCIÓN</span>
          <strong>Web Workers · Pyodide · Judge0</strong>
        </div>
        <div>
          <span>AULA</span>
          <strong>Supabase Auth · Postgres · RLS</strong>
        </div>
      </section>
    </main>
  );
}
