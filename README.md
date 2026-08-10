# Tomatin Code Lab

Tomatin Code Lab es un aula multilenguaje, todavía en desarrollo, para enseñar
y practicar Programación I y II mediante veinte misiones originales en
JavaScript, Python y C++. Reúne enunciado, editor, ejecución, entregas,
feedback, progreso y herramientas para mentor en una misma aplicación.

- **Versión estable:** [eeminionn.github.io/tomatin-code-lab](https://eeminionn.github.io/tomatin-code-lab/)
- **Aula 3.0 beta:** [eeminionn.github.io/tomatin-code-lab/beta](https://eeminionn.github.io/tomatin-code-lab/beta/)
- **Estado:** en desarrollo; no es un producto terminado.

> Proyecto independiente. No está afiliado ni respaldado por MIT. Los
> enunciados y recursos educativos de esta plataforma son originales.

## Quiero contribuir

Para corregir código, diseño, textos, tests o misiones **no necesitas crear un
backend, configurar OAuth ni publicar tu fork**. Sin variables de entorno, la
aplicación abre un aula demo local con diez estudiantes ficticios.

Requisitos: [Git](https://git-scm.com/), Node.js 22 o superior y
[pnpm 11](https://pnpm.io/installation).

1. Haz clic en **Fork** en GitHub.
2. Clona tu fork y conserva el repositorio original como `upstream`:

```bash
git clone https://github.com/TU_USUARIO/tomatin-code-lab.git
cd tomatin-code-lab
git remote add upstream https://github.com/eeminionn/tomatin-code-lab.git
```

3. Instala las dependencias y abre el modo demo:

```bash
corepack enable
pnpm install
pnpm dev
```

La aplicación queda en
`http://127.0.0.1:4173/tomatin-code-lab/beta/`. En la pantalla de acceso puedes
entrar como mentor o estudiante demo; nada de ese modo se escribe en Supabase
ni en los repositorios oficiales.

4. Crea una rama, realiza un cambio enfocado y verifica:

```bash
git switch -c feature/descripcion-corta
pnpm check
```

5. Sube la rama a tu fork y abre un pull request hacia `eeminionn/main`:

```bash
git push -u origin feature/descripcion-corta
```

Antes de trabajar, revisa [CONTRIBUTING.md](CONTRIBUTING.md), el
[código de conducta](CODE_OF_CONDUCT.md) y los issues abiertos. Los cambios de
base de datos deben agregarse como una migración nueva; no modifiques una
migración que ya se encuentre publicada.

## Qué recibe un fork

Un fork copia el historial y todos los archivos versionados: frontend,
migraciones, Edge Functions, tests, workflows y `.env.example`. No copia la
infraestructura ni los datos de la instalación oficial.

| Sí queda en el fork | No se copia al fork |
| --- | --- |
| Código y archivos rastreados por Git | Usuarios, clases, entregas o datos de Supabase |
| Migraciones y políticas RLS | Secrets y variables configurados en GitHub Actions |
| `.env.example` con marcadores | `.env`, `.env.local` y otros archivos ignorados |
| Workflows de despliegue | GitHub OAuth App y su client secret |
| Tests y catálogo público | Repositorio privado de resoluciones |

`.gitignore` no oculta archivos que ya estaban versionados: solo evita que Git
agregue archivos locales coincidentes. En este proyecto excluye dependencias,
builds, reportes, cobertura y todos los `.env*`, excepto `.env.example`. Por
eso quien haga fork debe crear sus propias variables y secretos.

## Publicar un fork completo

Esta sección es opcional. Úsala solo si quieres operar una instalación
independiente con usuarios reales, base de datos y entregas. La instalación no
compartirá cuentas ni información con Tomatin Code Lab oficial.

### 1. Personaliza el propietario

No existe una contraseña de administrador dentro del frontend. El rol `owner`
se entrega únicamente a la cuenta cuyo **GitHub ID numérico** coincida con la
configuración privada del backend.

Antes del primer despliegue de Supabase:

1. Abre `https://api.github.com/users/TU_USUARIO` y copia el número de `id`.
2. En
   [`supabase/migrations/202608090001_configure_owner.sql`](supabase/migrations/202608090001_configure_owner.sql),
   reemplaza `109454414` por ese número.
3. No reemplaces ese valor por el nombre de usuario: el ID numérico no cambia
   cuando una cuenta cambia de nombre.

Esa migración debe configurarse antes de crear el primer usuario. Si ya
desplegaste y alguien inició sesión, crea una migración nueva para cambiar
`private.app_configuration`; no edites el historial ya aplicado.

Los textos `eeminionn` que aparecen en `v2/src/data/demo-classroom.ts` son solo
datos de demostración. Puedes personalizarlos, pero no conceden permisos.

### 2. Crea el backend Supabase

1. Crea un proyecto nuevo en [Supabase](https://supabase.com/dashboard).
2. Guarda estos datos:
   - **Project ID:** aparece en la URL y en `Project Settings`.
   - **Database password:** la contraseña elegida al crear el proyecto.
   - **Project URL** y **Publishable key:** aparecen en el diálogo `Connect`.
   - **Access token personal:** se crea en la configuración de tu cuenta de
     Supabase, no dentro del proyecto.
3. Copia `.env.example` a `.env.local` y completa solo las variables públicas
   del navegador:

```bash
VITE_SUPABASE_URL=https://TU_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

La publishable key está diseñada para el navegador y la seguridad depende de
RLS. Nunca pongas en un archivo `VITE_*` la database password, access token,
OAuth client secret, una secret key ni una service-role key.

### 3. Configura inicio de sesión con GitHub

1. En GitHub abre `Settings > Developer settings > OAuth Apps` y crea una OAuth
   App.
2. Usa como `Authorization callback URL`:

```text
https://TU_PROJECT_ID.supabase.co/auth/v1/callback
```

3. Copia el Client ID y Client Secret al proveedor GitHub de Supabase en
   `Authentication > Sign In / Providers`.
4. En `Authentication > URL Configuration` define:

```text
Site URL: https://TU_USUARIO.github.io/TU_REPOSITORIO/beta/
Redirect URL: https://TU_USUARIO.github.io/TU_REPOSITORIO/beta/
```

Para OAuth local, agrega también
`http://127.0.0.1:4173/tomatin-code-lab/beta/` como Redirect URL. El callback
de GitHub siempre apunta a Supabase; la Redirect URL de Supabase apunta a la
aplicación.

### 4. Configura GitHub Actions

En el fork abre `Settings > Secrets and variables > Actions`.

Agrega como **Repository secrets**:

| Nombre | Valor |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | Access token personal de Supabase |
| `SUPABASE_DB_PASSWORD` | Contraseña de la base del proyecto |
| `SUPABASE_PROJECT_ID` | ID o reference del proyecto Supabase |
| `SUBMISSION_REPOSITORY_TOKEN` | Token del repositorio privado de entregas |

Agrega como **Repository variables**:

| Nombre | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key del proyecto |
| `APP_ORIGIN` | Opcional: origen de dominio personalizado, sin ruta |
| `SUBMISSION_REPOSITORY_OWNER` | Tu usuario u organización de GitHub |
| `SUBMISSION_REPOSITORY_NAME` | Nombre del repositorio privado de entregas |

GitHub no permite crear secrets cuyo nombre empiece con `GITHUB_`; por eso el
token se llama `SUBMISSION_REPOSITORY_TOKEN` en Actions. El workflow lo instala
en Supabase con el nombre esperado por las Edge Functions.

### 5. Crea el repositorio de entregas

1. Crea un repositorio **privado**, por ejemplo
   `TU_USUARIO/tomatin-code-lab-resoluciones`.
2. Crea un fine-grained personal access token limitado a ese repositorio con
   `Administration: Read and write` y `Contents: Read and write`.
3. Guarda el token y los nombres usando las claves del paso anterior.

No uses el repositorio público de la aplicación para respuestas reales: GitHub
no permite ocultar carpetas concretas dentro de un repositorio público.

### 6. Despliega backend y frontend

1. En `Actions`, ejecuta manualmente **Deploy Supabase**. Este aplica las
   migraciones, configura secretos y publica las Edge Functions.
2. En `Settings > Pages`, selecciona **GitHub Actions** como fuente.
3. Ejecuta **Deploy GitHub Pages**.
4. Abre `https://TU_USUARIO.github.io/TU_REPOSITORIO/beta/` e inicia sesión con
   la cuenta cuyo GitHub ID configuraste. Debe entrar al panel de propietario.

La ruta de Pages se calcula automáticamente a partir del nombre del fork. En
una compilación manual puedes definir `VITE_BASE_PATH`, incluyendo `/` al
inicio y al final. Si publicas en una ruta distinta de `/<repositorio>/beta/`,
debes adaptar también el montaje de `_site/beta` y el smoke test del workflow.

## Variables y secretos

| Dato | ¿Puede estar en Git? | Ubicación correcta |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Sí | `.env.local` o variable de Actions |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Sí | `.env.local` o variable de Actions |
| GitHub ID numérico del owner | Sí | Migración de configuración |
| `SUPABASE_ACCESS_TOKEN` | No | Secret de Actions |
| `SUPABASE_DB_PASSWORD` | No | Secret de Actions |
| OAuth Client Secret | No | Supabase Auth |
| `SUBMISSION_REPOSITORY_TOKEN` | No | Secret de Actions |
| Supabase secret/service-role key | No | Solo backend de Supabase |

Si un secreto se publica por accidente, elimínalo del historial y revócalo de
inmediato; agregarlo después a `.gitignore` no lo vuelve privado.

## Verificación

```bash
pnpm check
pnpm test:e2e
supabase db start
supabase test db
```

`pnpm check` valida tipos, build, pruebas unitarias y las 60 soluciones de
referencia. Playwright cubre los recorridos de estudiante y mentor; pgTAP
comprueba las políticas RLS contra una base temporal.

## Estructura

- `v2/`: aplicación React, TypeScript, Vite y Monaco.
- `v2/src/data/programming-*.ts`: catálogo y soluciones de referencia.
- `supabase/migrations/`: esquema, configuración, RLS y catálogo inicial.
- `supabase/functions/`: ejecución, entregas, administración y sincronización.
- `.github/workflows/`: CI y despliegues reproducibles.
- `index.html`, `styles.css`, `js/`: versión estable conservada durante el piloto.

## Licencia

El código se distribuye bajo licencia MIT. El contenido educativo original se
publica bajo [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
