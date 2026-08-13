# Estudio de interacción: ejecutar una misión

## Alcance

Evaluación heurística del workspace a partir de los incidentes observados en el piloto. No reemplaza entrevistas ni pruebas moderadas con estudiantes. Su objetivo es reducir errores de modelo mental antes de la siguiente sesión del curso.

## Usuarios y tarea principal

- Estudiantes principiantes que todavía asocian programar con una consola completa.
- Deben completar una función ya declarada y conservar su firma.
- El evaluador entrega distintos argumentos y compara el valor devuelto.
- No deben pedir datos, fijar los valores del ejemplo ni responder mediante la consola.

## Problemas observados

1. Los parámetros se perciben como datos invisibles o inexistentes.
2. `print`, `console.log` y `cout` se interpretan como la respuesta final.
3. `input`, `prompt` y `cin` parecen necesarios para iniciar el programa.
4. “Test fallido” informa el estado, pero no la siguiente acción.
5. Entrada, llamada de función, valor obtenido y valor esperado aparecen demasiado tarde en el flujo.

## Decisiones de interacción

- Mostrar antes del enunciado el recorrido `datos → llamada → parámetros → return`.
- Usar un caso real de la misión, no un ejemplo abstracto.
- Nombrar las construcciones concretas de cada lenguaje.
- Mantener la consola como herramienta de observación y separarla de la respuesta evaluada.
- Convertir cada resultado en una recomendación breve y accionable.
- Mantener los tests ocultos: solo se comunica la categoría pedagógica del error.

## Escenarios de validación

1. El estudiante explica de dónde salen los parámetros sin ejecutar código.
2. Un código que solo imprime recibe una indicación para usar `return`.
3. Un código que pide datos recibe una indicación para usar los parámetros.
4. Un error de sintaxis enlaza a su línea.
5. Un test público fallido muestra llamada, esperado, obtenido y siguiente paso.
6. Un error del proveedor se distingue de un error escrito por el estudiante.

## Métricas para el piloto

- Porcentaje que ejecuta sin agregar entrada manual.
- Porcentaje que identifica `return` como respuesta en el primer intento.
- Ejecuciones necesarias hasta el primer test aprobado.
- Solicitudes de ayuda relacionadas con “qué datos entran”.
- Tiempo entre primer error y siguiente ejecución.

La meta inicial es que 8 de 10 estudiantes puedan describir correctamente el contrato de la función y corregir un caso de “imprimir sin retornar” sin intervención del mentor.
