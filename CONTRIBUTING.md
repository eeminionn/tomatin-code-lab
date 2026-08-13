# Contribuir

Gracias por mejorar Tomatin Code Lab. La mayoría de las contribuciones están
pensadas para estudiantes y deben ser pequeñas, claras y fáciles de revisar.

## Antes de empezar

1. Revisa si ya existe un issue parecido.
2. Comenta que quieres trabajarlo o abre un issue breve.
3. Crea una rama desde `main`.

Los forks pueden cambiar el frontend y su documentación. No deben modificar
`supabase/`, workflows de producción, secretos ni datos de estudiantes.

## Trabajar en local

```bash
corepack enable
pnpm install
pnpm frontend:dev
```

El modo local usa datos ficticios y no se conecta al backend. Antes de enviar:

```bash
pnpm check:frontend
```

## Pull request

Incluye solamente:

- El issue relacionado.
- Una explicación corta del cambio.
- Cómo lo probaste.
- Una captura si cambiaste algo visible.

GitHub Actions hará el resto de las comprobaciones. Nunca publiques tokens,
contraseñas, datos personales ni soluciones privadas.

Participa con respeto y sigue el [código de conducta](CODE_OF_CONDUCT.md).
