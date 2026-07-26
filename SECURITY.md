# Security

## Versiones publicadas

La versión estable mantiene cuentas y progreso de demostración en
`localStorage`. Sus credenciales públicas no protegen datos reales.

La beta 2.0 funciona en dos modos:

- Sin variables Supabase usa datos ficticios locales para recorrer la interfaz.
- Con Supabase usa OAuth o magic link, invitaciones de un uso, roles de servidor,
  RLS y Edge Functions para ejecutar entregas.

No ingreses datos personales o soluciones reales en el modo demo.

## Ejecución de código

- El navegador limita el código a 64 KB y la salida a 32 KB.
- JavaScript y Python se ejecutan en Web Workers para pruebas visibles.
- C++ y todas las entregas verificadas pasan por una Edge Function y Judge0.
- La Edge Function limita CPU a 2 segundos, pared a 5 segundos y memoria a
  128 MB.
- Los endpoints no aceptan tests enviados por el cliente. Resuelven la versión y
  los tests ocultos desde el esquema privado.
- El límite inicial es de 20 ejecuciones remotas y 10 entregas por usuario/hora.

La instancia pública de Judge0 sirve para el piloto y no ofrece un SLA. Para
clases con requisitos de disponibilidad se debe configurar una instancia
gestionada o propia mediante `JUDGE0_URL`.

## Secretos

Nunca confirmes `.env`, service-role keys, access tokens, contraseñas de base de
datos ni claves de Judge0. La clave publicable de Supabase puede vivir en el
frontend; la seguridad depende de RLS, no de ocultarla.

## Reportar una vulnerabilidad

Abre un security advisory privado en el repositorio. Incluye versión, pasos de
reproducción, impacto y una prueba mínima. No publiques secretos ni datos
personales en issues.
