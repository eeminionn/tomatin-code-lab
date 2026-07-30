# Tomatin Code Lab

Aula multilenguaje, actualmente en desarrollo, para practicar Programación I y
II con veinte misiones originales.

- **Versión estable:** [eeminionn.github.io/tomatin-code-lab](https://eeminionn.github.io/tomatin-code-lab/)
- **Aula 3.0 beta:** [eeminionn.github.io/tomatin-code-lab/beta](https://eeminionn.github.io/tomatin-code-lab/beta/)

> Proyecto independiente. No está afiliado ni respaldado por MIT. El temario
> toma como referencia conceptos habituales de cursos universitarios; los
> enunciados y recursos de esta plataforma son originales.

## Aula 3.0

- React, TypeScript, Vite, rutas con hash y Monaco Editor cargado bajo demanda.
- Veinte misiones con variantes reales de JavaScript, Python y C++.
- Misiones guiadas con contexto, meta, contrato, ejemplos explicados, pasos,
  restricciones, criterios de éxito y tres pistas progresivas.
- Enunciado, editor, consola, tests, feedback e historial versionado en un
  mismo workspace.
- Borradores separados por lenguaje, guardados en IndexedDB y sincronizados al
  backend cuando está disponible.
- JavaScript en Web Worker, Python con Pyodide y ejecución remota con Judge0.
- Supabase Auth exclusivamente con GitHub, Postgres, Realtime, RLS,
  invitaciones de un uso y roles `owner`, `mentor` y `student`.
- Asignaciones por estudiante, revisión, reentrega, XP idempotente y ranking
  basado únicamente en tareas aprobadas.
- Un repositorio privado por estudiante bajo `eeminionn`, con una carpeta por
  misión y actualización automática al entregar.
- Panel del mentor con métricas reales, matriz filtrable, actividad reciente,
  detalle por estudiante, historial de código guardado y vista estudiante de
  solo lectura.
- Revisión con comentarios por línea, criterios reutilizables y enlaces
  directos desde Feedback a la entrega y versión revisada.
- Soluciones cargadas bajo demanda solo para `owner` y `mentor`; nunca se
  incluyen en el catálogo público ni aparecen en vista estudiante.

Las soluciones de referencia y los tests ocultos solo aparecen en
`private.mission_variants_secure`. El catálogo que Vite entrega al navegador se
genera por separado y no contiene esos campos.

## Desarrollo local

Requiere Node.js 20 o superior y pnpm 11:

```bash
pnpm install
pnpm dev
```

La beta 3.0 queda disponible en
`http://127.0.0.1:4173/tomatin-code-lab/beta/`. Sin variables de entorno abre
un aula demostrativa local para diez estudiantes.

## Activar Supabase

1. Crea un proyecto Supabase y configura GitHub como proveedor OAuth.
2. En la OAuth App de GitHub, usa como `Authorization callback URL` la URL de
   callback que muestra Supabase. Para este proyecto es
   `https://vowopvcxrzpuudtsraik.supabase.co/auth/v1/callback`.
3. En Supabase, bajo `Authentication > URL Configuration`, usa
   `https://eeminionn.github.io/tomatin-code-lab/beta/` como `Site URL` y añade
   esa misma URL exacta a `Redirect URLs`.
4. Copia `.env.example` a `.env.local` y completa:

```bash
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

5. En GitHub, crea los secrets `SUPABASE_ACCESS_TOKEN`,
   `SUPABASE_DB_PASSWORD` y `SUPABASE_PROJECT_ID`.
6. En GitHub Actions, crea las variables `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_PUBLISHABLE_KEY`.
7. Ejecuta manualmente el workflow `Deploy Supabase`; desde entonces los
   cambios en `supabase/` se despliegan al hacer merge a `main`.

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` son suministradas automáticamente
a las Edge Functions. `JUDGE0_URL` y `JUDGE0_API_KEY` son opcionales; por
defecto se usa la instancia pública de Judge0 CE.

## Repositorios de estudiantes

La aplicación crea un repositorio privado
`tomatin-code-lab-USUARIO-ID` bajo `eeminionn`, invita al estudiante como
colaborador y guarda cada entrega en:

```text
misiones/slug-de-la-mision/solucion.js
misiones/slug-de-la-mision/solucion.py
misiones/slug-de-la-mision/solucion.cpp
```

Para activarlo, crea un fine-grained personal access token de GitHub cuyo
resource owner sea `eeminionn`, con acceso a todos los repositorios y permisos
`Administration: Read and write` y `Contents: Read and write`. Guárdalo como el
secret de Actions `SUBMISSION_REPOSITORY_TOKEN` y vuelve a ejecutar `Deploy
Supabase`. La variable opcional `SUBMISSION_REPOSITORY_OWNER` permite cambiar
el propietario; si no existe, se usa `eeminionn`.

## Verificación

```bash
pnpm check
pnpm test:e2e
supabase db start
supabase test db
```

La verificación incluye la aplicación estable, tipos, build y las 60 soluciones
de referencia: JavaScript se ejecuta, Python se interpreta y C++ se compila con
C++20. Playwright cubre en serie los recorridos de estudiante y mentor; pgTAP
comprueba las políticas RLS contra una base temporal. El catálogo y la migración SQL se
regeneran desde una única fuente para evitar que se desalineen.

## Estructura

- `v2/`: aplicación React de la beta 3.0.
- `v2/src/data/programming-*.ts`: fuente privada del catálogo y soluciones.
- `v2/src/data/missions-public.generated.ts`: catálogo apto para el navegador.
- `supabase/migrations/`: esquema, RLS y catálogo inicial.
- `supabase/functions/`: endpoints seguros `run-code`, `submit-code`,
  `provision-repository` y `mission-admin`.
- `scripts/generate-supabase-seed.ts`: generador reproducible del catálogo.
- `index.html`, `styles.css`, `js/`: versión estable, preservada durante el piloto.

## Licencia

El código se distribuye bajo licencia MIT. El contenido educativo original se
publica bajo [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
