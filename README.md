# Tomatin Code Lab

Plataforma web gratuita para practicar Programacion I y II con veinte misiones
originales, evaluacion automatica, humor chileno y una estetica glass-terminal.
Funciona como sitio estatico en GitHub Pages y puede instalarse para uso offline.

**Sitio:** [eeminionn.github.io/tomatin-code-lab](https://eeminionn.github.io/tomatin-code-lab/)

> Proyecto independiente. No esta afiliado ni respaldado por MIT. El temario
> toma como referencia conceptos habituales de cursos universitarios de
> introduccion a ciencias de la computacion; todos los enunciados y recursos de
> esta plataforma son originales.

## Que incluye

- Diez misiones de Programacion I: variables, control de flujo, funciones,
  colecciones, strings, objetos, depuracion, pruebas y proyecto integrador.
- Diez misiones de Programacion II: recursion, complejidad, busqueda,
  ordenamiento, listas, colas, arboles, grafos, hashing y programacion dinamica.
- Laboratorio JavaScript ejecutado en un Web Worker con limite de tiempo.
- Pruebas visibles, progreso, XP, rachas y rangos persistentes.
- Ranking local con rivales ficticios claramente identificados.
- Telemetria en vivo del repositorio mediante la API REST publica de GitHub.
- Registro de estudiantes y panel admin de demostracion.
- Controles responsive, soporte de teclado, movimiento reducido y modo offline.
- Easter eggs discretos en la terminal y la interfaz.

## Demo local

No hay backend. Las cuentas y el progreso quedan solo en el navegador:

| Rol | Correo | Clave |
| --- | --- | --- |
| Estudiante | `demo@tomatin.local` | `tomatin123` |
| Admin | `admin@tomatin.local` | `mustakis42` |

Estas credenciales son publicas y no protegen datos reales. Lee
[SECURITY.md](./SECURITY.md) antes de adaptar el proyecto.

## Ejecutar

Sirve el repositorio con cualquier servidor estatico:

```bash
python3 -m http.server 4173
```

Luego abre `http://127.0.0.1:4173`.

## Verificar

Requiere Node.js 20 o superior:

```bash
npm run check
```

La misma verificacion se ejecuta en GitHub Actions para cada pull request y
push a `main`.

## Arquitectura

- `index.html` y `styles.css`: shell accesible y sistema visual.
- `js/missions.js`: catalogo y pruebas de las veinte misiones.
- `js/runner.js`: ejecucion aislada y limitada.
- `js/github.js`: integracion con la API REST publica de GitHub.
- `js/auth.js`, `js/store.js`, `js/admin.js`: datos locales de demostracion.
- `sw.js` y `manifest.webmanifest`: instalacion y soporte offline.

## Privacidad

La aplicacion no envia cuentas, soluciones ni progreso a un servidor. Los
recursos tipograficos y los iconos se cargan desde proveedores publicos; el
resto se sirve desde el propio repositorio.

## Contribuir

Consulta [CONTRIBUTING.md](./CONTRIBUTING.md). Los ejercicios nuevos deben ser
originales, tener objetivos claros, al menos dos pruebas ejecutables y funcionar
con teclado en escritorio y movil.

## Licencia

El codigo se distribuye bajo licencia MIT. El contenido educativo original se
publica bajo [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
