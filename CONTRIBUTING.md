# Contribuir

Las contribuciones deben mantener el proyecto educativo, original, accesible y
seguro. Lee el [código de conducta](CODE_OF_CONDUCT.md) antes de participar.

## Issues

Usa el formulario que corresponda y completa el contexto, las tareas, los
criterios de aceptación y la validación prevista. Cada issue de implementación
debe tener:

- Una persona responsable.
- Labels de tipo y área.
- Un milestone cuando forme parte de una entrega planificada.
- Un GitHub Project solo cuando exista un tablero activo que aporte seguimiento
  adicional; no se crea uno para duplicar un milestone.
- Una checklist actualizada durante el trabajo.

Las dudas abiertas pertenecen a Discussions. Nunca publiques secretos, tokens,
soluciones privadas ni datos personales de estudiantes.

## Flujo local

Las contribuciones provenientes de forks son exclusivamente de frontend. Usa
`pnpm frontend:dev` para trabajar sobre la interfaz actual de Aula 3.0 sin
conectar Supabase. No cambies `supabase/`, secretos, migraciones ni workflows de
producción; CI rechazará esos archivos en un PR desde fork.

1. Crea una rama enfocada desde `main`.
2. Realiza un cambio coherente y vinculado a un issue.
3. Ejecuta `pnpm check:frontend` y
   `pnpm test:e2e:frontend`.
4. Abre un pull request con `Closes #…`, impacto, validación, privacidad y
   despliegue.
5. Completa responsable, labels y milestone antes de solicitar revisión.
6. Fusiona solo con CI en verde y actualiza la checklist del issue.

## Misiones

- Escribe enunciados originales; no copies tareas de otros cursos.
- Incluye objetivo, contrato, starter code, pistas progresivas y casos
  ejecutables.
- Mantén las referencias locales acogedoras y comprensibles sin contexto
  adicional.
- Prefiere un concepto claro antes que un chiste.

## Privacidad

Las credenciales, tests ocultos y entregas estudiantiles son datos de servidor.
No deben aparecer en el bundle, fixtures, logs ni historial de Git. El sandbox
de contribución no debe enviar solicitudes a Supabase, Judge0 ni GitHub.

## Accesibilidad

Todos los controles necesitan una ruta de teclado y un nombre accesible. Revisa
escritorio y móvil, foco visible, movimiento reducido, contraste y etiquetas
largas en español.
