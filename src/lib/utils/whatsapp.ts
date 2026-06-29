interface WhatsappMessageParams {
  guestName: string;
  fecha: string;
  tipoServicio: string;
  menuANombre: string;
  menuADescripcion: string | null;
  menuAFotoUrl: string | null;
  menuBNombre: string;
  menuBDescripcion: string | null;
  menuBFotoUrl: string | null;
  phoneNumber: string;
}

export interface WhatsappMessage {
  texto: string;
  linkWaMe: string;
}

function normalizePhoneNumber(phone: string): string {
  // Remove spaces, dashes, parentheses
  let normalized = phone.replace(/[\s\-()]/g, "");

  // Remove leading +
  if (normalized.startsWith("+")) {
    normalized = normalized.slice(1);
  }

  // If doesn't start with country code, assume Chile (56)
  if (!normalized.match(/^56/) && !normalized.match(/^\d{10,}/)) {
    normalized = "56" + normalized;
  }

  return normalized;
}

function formatFechaLegible(fecha: string): string {
  const date = new Date(fecha + "T00:00:00");
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString("es-CL", options);
}

export function buildWhatsappMessage(params: WhatsappMessageParams): WhatsappMessage {
  const fechaLegible = formatFechaLegible(params.fecha);
  const tipoServicioLabel =
    params.tipoServicio === "almuerzo" ? "almuerzo" : "cena";

  let mensaje = `Hola ${params.guestName},\n\n`;
  mensaje += `Te saluda Hostal Loreto Belén. Te esperamos el ${fechaLegible} para tu ${tipoServicioLabel}.\n\n`;
  mensaje += `Tenemos dos alternativas:\n\n`;

  mensaje += `*Opción A:* ${params.menuANombre}\n`;
  if (params.menuADescripcion) {
    mensaje += `${params.menuADescripcion}\n`;
  }
  if (params.menuAFotoUrl) {
    mensaje += `${params.menuAFotoUrl}\n`;
  }
  mensaje += `\n`;

  mensaje += `*Opción B:* ${params.menuBNombre}\n`;
  if (params.menuBDescripcion) {
    mensaje += `${params.menuBDescripcion}\n`;
  }
  if (params.menuBFotoUrl) {
    mensaje += `${params.menuBFotoUrl}\n`;
  }
  mensaje += `\n`;

  mensaje += `Respóndenos con *A* o *B* para tener tu plato listo cuando llegues.\n\n`;
  mensaje += `⏰ *Confirma tu elección lo antes posible, preferiblemente antes de la hora del servicio.*\n`;
  mensaje += `Si no confirmas a tiempo, el hostal te asignará una de las opciones disponibles.\n\n`;
  mensaje += `Saludos`;

  const phoneNormalized = normalizePhoneNumber(params.phoneNumber);
  const linkWaMe = `https://wa.me/${phoneNormalized}?text=${encodeURIComponent(mensaje)}`;

  return {
    texto: mensaje,
    linkWaMe,
  };
}
