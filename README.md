# Tomatin Code Lab

Tomatin Code Lab es un aula multilenguaje, todavía en desarrollo, para enseñar
y practicar Programación I y II mediante veinte misiones originales en
JavaScript, Python y C++. Reúne enunciado, editor, ejecución, feedback,
progreso y herramientas de mentor en una interfaz terminal.

- **Versión estable:** [eeminionn.github.io/tomatin-code-lab](https://eeminionn.github.io/tomatin-code-lab/)
- **Aula 3.0 beta:** [eeminionn.github.io/tomatin-code-lab/beta](https://eeminionn.github.io/tomatin-code-lab/beta/)
- **Estado:** en desarrollo; no es un producto terminado.

> Proyecto independiente. No está afiliado ni respaldado por MIT. Los
> enunciados y recursos educativos de esta plataforma son originales.

## Contribuciones de frontend

Los forks de este repositorio se usan exclusivamente para mejorar el frontend:
componentes, diseño, responsive, accesibilidad, redacción, navegación,
visualizaciones y experiencia de uso. No necesitas Supabase, OAuth, tokens,
base de datos ni acceso a la infraestructura oficial.

El sandbox carga el código actual de [`v2/`](v2/), la misma aplicación React y
TypeScript publicada como **Aula 3.0 beta**. No es una reconstrucción de la
versión estable antigua ni una maqueta distinta.

## Abrir Aula 3.0 localmente

Requisitos: [Git](https://git-scm.com/), Node.js 22 o superior y
[pnpm 11](https://pnpm.io/installation).

1. Haz clic en **Fork** en GitHub.
2. Clona tu fork y registra el repositorio original como `upstream`:

```bash
git clone https://github.com/TU_USUARIO/tomatin-code-lab.git
cd tomatin-code-lab
git remote add upstream https://github.com/eeminionn/tomatin-code-lab.git
```

3. Instala dependencias:

```bash
corepack enable
pnpm install
```

4. Construye y abre el sandbox estático:

```bash
pnpm frontend
```

Se abrirá `http://127.0.0.1:4173/`. El comando genera HTML, CSS, JavaScript y
assets en `dist-beta/`, y luego los sirve con el preview estático de Vite. Ese
servidor solo entrega archivos: no implementa API, autenticación ni base de
datos.

Para trabajar con recarga inmediata durante el diseño:

```bash
pnpm frontend:dev
```

No abras `dist-beta/index.html` mediante `file://`: los módulos ES, Web Workers
y assets de Monaco necesitan un origen HTTP local. Esto no activa un backend;
solo evita las restricciones de seguridad que el navegador aplica a archivos
abiertos directamente desde el disco.

## Qué funciona en el sandbox

- Las vistas reales de estudiante y mentor de Aula 3.0.
- Navegación, filtros, pestañas, modales, responsive y vista estudiante.
- Las veinte misiones y sus variantes JavaScript, Python y C++.
- Monaco Editor, edición de código y borradores locales.
- Ejecución de JavaScript en Web Worker.
- Ejecución de Python en Pyodide Worker.
- Redimensionado del workspace, resultados y estados visuales.
- Personalización visual del avatar antes de guardar.
- Datos ficticios de diez estudiantes para diseñar dashboards y rankings.

## Qué queda desactivado

- Inicio de sesión real con GitHub.
- Lectura o escritura en Supabase.
- Entregas, tests ocultos y sincronización de resoluciones.
- Ejecución remota de C++ y cualquier llamada a Judge0.
- Crear o modificar tareas, invitaciones y misiones.
- Aprobar entregas, asignar XP o solicitar cambios.
- Guardar perfiles, eliminar feedback o modificar datos del curso.
- Edge Functions, Realtime y repositorios privados.

Los controles siguen visibles para poder diseñar todos sus estados, pero las
acciones que necesitan backend aparecen deshabilitadas. Además, el runtime
ignora las credenciales Supabase aunque exista un `.env.local` por accidente.
Una barra amarilla persistente identifica el sandbox.

## Archivos permitidos

Una contribución desde un fork debe concentrarse en:

- `v2/src/components/`
- `v2/src/pages/`
- `v2/src/styles.css`
- `v2/src/lib/`
- `v2/src/data/` cuando el cambio sea exclusivamente de presentación
- `v2/e2e/` y `v2/tests/`
- `v2/public/` y assets visuales
- `README.md`, `CONTRIBUTING.md`, `package.json` y `pnpm-lock.yaml`

No modifiques desde un fork:

- `supabase/`
- `.github/workflows/pages.yml`
- `.github/workflows/supabase.yml`
- secretos, migraciones, RLS, Edge Functions o sincronización de entregas

CI revisa este límite. Un pull request proveniente de un fork que cambie
backend o workflows de producción fallará automáticamente. Los workflows de
Pages y Supabase también están restringidos al repositorio oficial.

## Enviar un cambio

1. Sincroniza tu fork y crea una rama:

```bash
git fetch upstream
git switch main
git merge --ff-only upstream/main
git switch -c frontend/descripcion-corta
```

2. Trabaja usando `pnpm frontend:dev`.
3. Verifica el resultado:

```bash
pnpm frontend:build
pnpm check:frontend
pnpm test:e2e:frontend
```

4. Sube la rama:

```bash
git push -u origin frontend/descripcion-corta
```

5. Abre un pull request hacia `eeminionn/tomatin-code-lab:main`, enlaza un
   issue y explica el cambio observable. Para cambios visuales incluye una
   captura de escritorio y otra móvil.

Revisa también [CONTRIBUTING.md](CONTRIBUTING.md), el
[código de conducta](CODE_OF_CONDUCT.md) y los issues abiertos.

## Forks y `.gitignore`

Un fork copia el historial y todos los archivos versionados. No copia secrets,
variables de Actions, usuarios, datos de Supabase ni el repositorio privado de
resoluciones.

`.gitignore` no es una caja fuerte: evita agregar archivos locales nuevos, pero
no oculta archivos que ya estaban versionados. En este proyecto quedan fuera
`node_modules/`, builds, reportes, cobertura y todos los `.env*`, excepto
`.env.example`. Para el sandbox no debes crear ningún `.env`.

## Comandos

| Comando | Uso |
| --- | --- |
| `pnpm frontend` | Construye y abre el sandbox estático |
| `pnpm frontend:dev` | Sandbox con recarga inmediata |
| `pnpm frontend:build` | Genera el frontend estático en `dist-beta/` |
| `pnpm check:frontend` | Tipos, unidades y build desconectado |
| `pnpm check` | Verificación integral reservada al repositorio oficial |
| `pnpm test:e2e:frontend` | Recorrido del sandbox sin backend |
| `pnpm test:e2e` | Recorridos completos de la aplicación demo |

## Licencia

El código se distribuye bajo licencia MIT. El contenido educativo original se
publica bajo [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
