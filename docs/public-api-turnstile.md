# API pública: verificación Cloudflare Turnstile

`POST /api/public/reservation-requests` exige un token de Cloudflare Turnstile.

## Campo nuevo

| Campo | Tipo | Descripción |
|---|---|---|
| `turnstile_token` | string | Token que entrega el widget de Turnstile en el sitio público. Obligatorio. |

El token no forma parte de los datos del formulario: el servidor lo separa antes de validar el resto de los campos.

## Orden de las comprobaciones

1. JSON válido (y tamaño máximo).
2. Honeypot (`website` lleno): respuesta falsa 201, sin llamar a Cloudflare.
3. Validación de los campos del formulario (un formulario inválido no gasta el token).
4. Verificación de Turnstile.
5. Límites anti-spam y creación en la base de datos.

## Códigos de error nuevos

Mismo formato que el resto de la API: `{ "error": "<codigo>" }`, con CORS.

| HTTP | `error` | Cuándo |
|---|---|---|
| 400 | `verificacion_requerida` | `turnstile_token` ausente, vacío o no es texto. |
| 400 | `verificacion_fallida` | Cloudflare rechazó el token (vencido, ya usado o inválido). |
| 503 | `verificacion_no_disponible` | Cloudflare no respondió en 5 s, falló la red o devolvió un error HTTP. El cliente puede reintentar. |
| 500 | `error_interno` | Falta `TURNSTILE_SECRET_KEY` en producción (el detalle solo queda en el log del servidor, sin valores). |

## Configuración

- Variable de entorno `TURNSTILE_SECRET_KEY` (Vercel, Production y Preview, Sensitive). Nunca se imprime ni se registra.
- Sin la variable y con `NODE_ENV` distinto de `production` (desarrollo local y pruebas), la verificación se omite. En producción nunca se omite.
- La IP enviada a Cloudflare (`remoteip`) sale de la misma lógica que el `client_ref` (`getClientIp`: primer valor de `x-forwarded-for`, o `x-real-ip`).
