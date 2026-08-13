# Tomatin Code Lab

Tomatin Code Lab es un aula para aprender programación resolviendo misiones,
recibir feedback y avanzar junto a un profesor.

**Abrir la plataforma:**
[eeminionn.github.io/tomatin-code-lab](https://eeminionn.github.io/tomatin-code-lab/)

Los estudiantes trabajan desde el navegador, guardan su avance y entregan sus
respuestas. El profesor crea tareas, revisa entregas, acompaña el progreso y
administra el curso desde un panel propio.

## Contribuir al frontend

Las contribuciones de forks se concentran en la interfaz: diseño, textos,
accesibilidad, navegación, responsive y experiencia de uso. El modo local usa
datos de ejemplo y mantiene el backend desactivado, por lo que no necesitas
credenciales ni acceso a la clase real.

### Abrir el proyecto

Necesitas Git y Node.js 22 o superior.

```bash
git clone https://github.com/TU_USUARIO/tomatin-code-lab.git
cd tomatin-code-lab
corepack enable
pnpm install
pnpm frontend:dev
```

Abre [http://127.0.0.1:4173](http://127.0.0.1:4173). Verás las mismas pantallas
de estudiante y profesor que están publicadas, con diez estudiantes ficticios.
Los botones que necesitan el backend siguen visibles para poder diseñarlos,
pero no realizan cambios reales.

### Qué puedes modificar

- Componentes, páginas, estilos, textos y recursos de `v2/`.
- Pruebas relacionadas con tu cambio.
- Documentación del frontend.

No modifiques `supabase/`, secretos ni workflows de producción desde un fork.
GitHub Actions comprueba este límite automáticamente.

### Enviar un cambio

1. Crea una rama y realiza un cambio enfocado.
2. Ejecuta `pnpm check:frontend`.
3. Abre un pull request, enlaza el issue y agrega una captura si cambiaste la
   interfaz.

La guía corta está en [CONTRIBUTING.md](CONTRIBUTING.md). También aplican el
[código de conducta](CODE_OF_CONDUCT.md) y la [política de seguridad](SECURITY.md).

## Archivos locales

Un fork contiene todos los archivos versionados, pero no copia secretos,
variables de GitHub Actions, datos de Supabase ni entregas privadas. Los `.env`,
dependencias, builds y reportes locales están excluidos mediante `.gitignore`.

## Comandos útiles

| Comando | Uso |
| --- | --- |
| `pnpm frontend:dev` | Abre el frontend local con recarga automática |
| `pnpm check:frontend` | Revisa tipos, pruebas y build del frontend |
| `pnpm test:e2e:frontend` | Prueba que el modo local no use el backend |
| `pnpm check` | Ejecuta la verificación completa del repositorio oficial |

## Licencia

El código se distribuye bajo licencia MIT. El contenido educativo original se
publica bajo [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
