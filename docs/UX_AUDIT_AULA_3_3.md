# Auditoría de interacción: Aula 3.3

## Objetivo

Hacer que el aula sea fácil de entender para estudiantes que están empezando y rápida de operar para un profesor con diez alumnos. Esta revisión no representa una certificación de Stanford, MIT o UDD: aplica principios públicos de diseño centrado en las personas y usabilidad publicados por esas instituciones.

## Referentes aplicados

- Stanford d.school: observar a las personas, definir el problema, probar y volver a iterar. [Design Thinking Bootleg](https://dschool.stanford.edu/tools/design-thinking-bootleg)
- MIT: priorizar facilidad de aprendizaje, eficiencia, prevención de errores y satisfacción. [Usability](https://ocw.mit.edu/courses/6-831-user-interface-design-and-implementation-spring-2011/pages/in-class-activities/usability/)
- MIT: mantener visibles el estado del sistema, el control del usuario y la protección de su trabajo. [Heuristic Evaluation](https://web.mit.edu/6.813/www/sp16/classes/20-heuristic-evaluation/)
- UDD: diseñar la interacción a partir del comportamiento humano y no solo desde la tecnología. [Diseño de Interacción Digital](https://www.udd.cl/internacional/catalogo-cursos-diseno-digital/)

## Recorrido del estudiante

### Problemas observados

- El inicio repetía dos accesos principales para continuar la misma tarea.
- Una frase prometía un catálogo de práctica que ya no está disponible para estudiantes.
- Las tareas se abrían mediante una flecha pequeña, aunque toda la fila parecía interactiva.
- El compilador usaba palabras como `tests`, `diagnósticos` y `provider`, poco útiles para un principiante.
- El resultado explicaba el estado técnico antes que el siguiente paso.

### Cambios aplicados

- Un solo botón principal lleva a la próxima tarea.
- Toda la fila de una tarea abre su workspace y funciona con teclado.
- El inicio explica que allí aparecen solamente las tareas asignadas.
- El compilador habla de pruebas, errores para corregir y próximos pasos.
- Los mensajes distinguen con palabras simples si todo salió bien, si hay resultados incorrectos o si el servicio no pudo ejecutar.

## Recorrido del profesor

### Problemas observados

- La navegación lateral se repetía en una segunda barra con las mismas ocho secciones.
- Ocho indicadores tenían la misma importancia y desplazaban la acción principal.
- El contador de revisiones podía mostrar estados sin una entrega realmente disponible.
- “Matriz del curso” y los criterios “Correctitud” o “Casos límite” requerían interpretación.
- La revisión podía generar un enlace inválido si la versión de una misión ya no estaba en el catálogo local.

### Cambios aplicados

- Se conserva una sola navegación.
- Las entregas por revisar aparecen primero; luego se muestran cuatro datos esenciales.
- Los indicadores secundarios quedan bajo “Ver más indicadores”.
- El contador usa exactamente la misma cola que la pantalla de revisiones.
- “Estado de las tareas” reemplaza “Matriz del curso”.
- La lista opcional de revisión usa tres preguntas directas y los botones indican claramente “Pedir cambios” o cuántos XP se aprobarán.
- “Ver misión” aparece únicamente cuando la versión existe.

## Validación pendiente con personas

Una evaluación heurística detecta problemas probables, pero no reemplaza observar a usuarios reales. Antes de agregar funciones grandes conviene hacer dos sesiones de 20 minutos: una con un estudiante resolviendo y entregando una misión, y otra con eeminionn creando una tarea y corrigiendo dos entregas. Registrar dónde dudan, qué texto leen y cuántas acciones necesitan.

## Funciones grandes no implementadas

Estas ideas necesitan una prueba breve de necesidad antes de construirlas:

1. Recorrido guiado para la primera sesión del estudiante y lista de preparación inicial para el profesor.
2. Plantillas de corrección configurables por tarea, con criterios definidos por eeminionn.
3. Corrección en lote para revisar o aprobar varias entregas similares.
4. Alertas pedagógicas que sugieran a quién ayudar según atrasos, errores repetidos y uso de pistas.
5. Panel histórico del curso con tendencias semanales y exportación de resultados.

La regla para una próxima iteración será sencilla: una función nueva debe reducir tiempo, evitar un error frecuente o responder una necesidad observada en las sesiones. Si no cumple una de esas condiciones, no entra al aula.
