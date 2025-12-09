
# Configuración de Email

El sistema utiliza **Resend** para el envío de correos transaccionales (Vouchers).

## Variables de Entorno

Asegúrese de configurar la siguiente variable en su archivo `.env.local` y en el panel de Vercel:

```env
RESEND_API_KEY=re_123456789...
```

## Remitente

Por defecto, los correos se envían desde:
`Hostal Loreto Belén <noreply@resend.dev>`

Con respuesta dirigida a:
`reservas@loretobelen.cl`

> Nota: Para usar un dominio propio (ej: noreply@loretobelen.cl), debe verificar el dominio en el panel de Resend y actualizar `src/lib/email/sendReservationVoucherEmail.ts`.

## Pruebas

El flujo "Guardar y Enviar Voucher" en el formulario de reservas:
1. Guarda la reserva.
2. Genera el PDF en memoria.
3. Envía el correo usando la API de Resend.

Si el envío falla, verifique los logs de Vercel (Function Logs) para ver el error devuelto por Resend.
