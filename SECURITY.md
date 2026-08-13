# Seguridad

La plataforma publicada usa GitHub para iniciar sesión y Supabase para proteger
cuentas, tareas y progreso. El modo local de contribución usa datos ficticios y
no se conecta al backend.

## Datos y ejecución

- Los estudiantes solo pueden leer su propio progreso y sus entregas.
- Las soluciones, pruebas privadas y credenciales permanecen en el servidor.
- JavaScript y Python pueden ejecutarse localmente para obtener feedback rápido.
- C++ y las entregas verificadas pasan por un ejecutor remoto con límites de
  tiempo, memoria, tamaño de código y frecuencia.

## Secretos

Nunca confirmes `.env`, tokens, contraseñas, service-role keys ni claves del
ejecutor. La clave publicable de Supabase puede aparecer en el frontend; los
datos se protegen con políticas RLS.

## Reportar una vulnerabilidad

Usa un
[security advisory privado](https://github.com/eeminionn/tomatin-code-lab/security/advisories/new).
No publiques secretos ni datos personales en un issue.
