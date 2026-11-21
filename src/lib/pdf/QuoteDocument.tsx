import React from "react";
import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";
// Reutiliza los estilos del voucher para mantener la misma imagen.
import { styles } from "./ReservationVoucher";
import { discountLabel, formatQuoteCode, OCCUPANCY_LABELS, type QuoteCalcResult } from "../quotes/calc";
import type { QuoteRow } from "../quotes/service";

const formatDate = (d?: string | null) => {
    if (!d) return "-";
    try {
        return format(new Date(d + "T00:00:00"), "dd 'de' MMMM, yyyy", { locale: es });
    } catch {
        return d;
    }
};
const money = (n: number) => "$" + n.toLocaleString("es-CL");

const col = { occ: { width: 110 }, qty: { width: 60 }, nights: { width: 50 }, rate: { flex: 1 }, sub: { flex: 1 } };

export function QuoteDocument({ quote, calc, logo }: { quote: QuoteRow; calc: QuoteCalcResult; logo?: Buffer | null }) {
    const code = formatQuoteCode(quote.number);
    const conditions = (quote.conditions || "").split("\n").map((s) => s.trim()).filter(Boolean);
    const nights = calc.lines[0]?.nights ?? 0;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        {logo ? <Image src={logo} style={{ width: 44, height: 44, marginRight: 10 }} /> : null}
                        <View>
                            <Text style={styles.title}>Hostal Loreto Belén</Text>
                            <Text style={styles.subtitle}>Cotización</Text>
                        </View>
                    </View>
                    <View>
                        <Text style={{ fontSize: 12, fontWeight: "bold" }}>{code}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Datos del cliente</Text>
                    <View style={styles.row}><Text style={styles.label}>Empresa:</Text><Text style={styles.value}>{quote.company_name}</Text></View>
                    <View style={styles.row}><Text style={styles.label}>RUT:</Text><Text style={styles.value}>{quote.company_rut || "-"}</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Contacto:</Text><Text style={styles.value}>{quote.contact_name || "-"}</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Email:</Text><Text style={styles.value}>{quote.contact_email || "-"}</Text></View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Detalle de la estadía</Text>
                    <View style={styles.row}><Text style={styles.label}>Entrada (Check-in):</Text><Text style={styles.value}>{formatDate(quote.check_in)}</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Salida (Check-out):</Text><Text style={styles.value}>{formatDate(quote.check_out)}</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Duración:</Text><Text style={styles.value}>{nights} {nights === 1 ? "Noche" : "Noches"}</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Vigencia:</Text><Text style={styles.value}>{quote.validity_days} días{quote.valid_until ? ` (hasta el ${formatDate(quote.valid_until)})` : ""}</Text></View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Habitaciones</Text>
                    <View style={[styles.row, { fontWeight: "bold" }]}>
                        <Text style={col.occ}>Ocupación</Text><Text style={col.qty}>Hab.</Text><Text style={col.nights}>Noches</Text>
                        <Text style={col.rate}>Neto/noche</Text><Text style={col.sub}>Subtotal neto</Text>
                    </View>
                    {calc.lines.map((l, i) => (
                        <View key={i} style={styles.row}>
                            <Text style={col.occ}>{OCCUPANCY_LABELS[l.occupancy]}</Text><Text style={col.qty}>{l.rooms}</Text><Text style={col.nights}>{l.nights}</Text>
                            <Text style={col.rate}>{money(l.rate)}</Text><Text style={col.sub}>{money(l.subtotal)}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Resumen de montos</Text>
                    {calc.discount > 0 && (
                        <>
                            <View style={styles.row}><Text style={[styles.label, { width: 170 }]}>Subtotal:</Text><Text style={styles.value}>{money(calc.gross)}</Text></View>
                            <View style={styles.row}><Text style={[styles.label, { width: 170 }]}>{discountLabel(quote.discount_type, quote.discount_value, quote.discount_label)}:</Text><Text style={styles.value}>-{money(calc.discount)}</Text></View>
                        </>
                    )}
                    <View style={styles.row}><Text style={[styles.label, { width: 170 }]}>Neto:</Text><Text style={styles.value}>{money(calc.net)}</Text></View>
                    <View style={styles.row}><Text style={[styles.label, { width: 170 }]}>IVA (19%):</Text><Text style={styles.value}>{money(calc.iva)}</Text></View>
                    <View style={[styles.row, { marginTop: 4 }]}>
                        <Text style={[styles.label, { width: 170, fontSize: 12 }]}>Total c/ IVA:</Text>
                        <Text style={[styles.value, { fontSize: 12, fontWeight: "bold" }]}>{money(calc.total)} CLP</Text>
                    </View>
                </View>

                {conditions.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Condiciones de la estadía</Text>
                        {conditions.map((c, i) => (<Text key={i} style={{ marginBottom: 2 }}>• {c}</Text>))}
                    </View>
                )}

                <View style={styles.footer}>
                    <Text style={{ fontWeight: "bold", marginBottom: 5 }}>Información Importante</Text>
                    <Text>Check-out: hasta las 11:00 hrs</Text>
                    <Text style={styles.footerLine}>Dirección: Yungay 551</Text>
                    <Text style={styles.footerLine}>Teléfono: +56 61 241 3285</Text>
                    <Text style={styles.footerLine}>Puerto Natales - Chile</Text>
                </View>
            </Page>
        </Document>
    );
}
