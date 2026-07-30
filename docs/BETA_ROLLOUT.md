# Lanzamiento beta 3.0

Tomatin Code Lab 3.0 permanece en
`https://eeminionn.github.io/tomatin-code-lab/beta/` durante el piloto. La
versión estable de la raíz no se reemplaza todavía.

## Barreras automáticas

- CI ejecuta las pruebas heredadas, TypeScript, Edge Functions, las 60
  soluciones de referencia, el build y nueve recorridos Playwright.
- pgTAP aplica todas las migraciones desde cero y verifica RLS, privacidad y
  contratos de versión.
- GitHub Pages falla si faltan las variables públicas de Supabase.
- Supabase falla si faltan los secretos de despliegue o de sincronización con
  los repositorios estudiantiles.
- Después de publicar, Pages comprueba que `/beta/` responda y sirva la versión
  3.0 desde la ruta correcta.

## Piloto con dos estudiantes

- [ ] Iniciar sesión con GitHub mediante dos invitaciones de un solo uso.
- [ ] Confirmar que cada cuenta recibe únicamente rol `student`.
- [ ] Abrir la Misión 01 en dos acciones y comprenderla sin revelar pistas.
- [ ] Guardar código distinto en JavaScript, Python y C++ sin perder borradores.
- [ ] Ejecutar al menos un caso correcto y uno incorrecto en cada lenguaje.
- [ ] Entregar una misión y comprobar su actualización en el repositorio privado.
- [ ] Revisar desde `/admin`, comentar una línea y solicitar cambios.
- [ ] Confirmar que la reentrega usa la versión actual sin borrar el historial.
- [ ] Aprobar una entrega y comprobar que el XP se emita una sola vez.
- [ ] Entrar en `Ver como estudiante` y confirmar que todas las mutaciones estén
  deshabilitadas.
- [ ] Validar la experiencia en notebook y una edición breve desde móvil.

## Paso a diez estudiantes

El piloto se amplía cuando ambos estudiantes completan el recorrido sin pérdida
de código, filtración de datos privados ni bloqueos del ejecutor. Durante la
primera clase se revisan el estado de Supabase, la cola de Judge0, los errores
de sincronización y el tiempo medio de revisión desde `/admin`.

La raíz se promueve solo cuando los diez estudiantes pueden iniciar sesión,
trabajar y entregar, y eeminionn puede llegar a cualquier entrega en un máximo
de tres acciones.
