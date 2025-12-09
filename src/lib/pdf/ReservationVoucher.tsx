import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Define styles
const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#333',
    },
    header: {
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        paddingBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    subtitle: {
        fontSize: 10,
        color: '#666',
    },
    section: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 5,
        backgroundColor: '#f0f0f0',
        padding: 4,
        color: '#000',
    },
    row: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    label: {
        width: 120,
        fontWeight: 'bold',
        color: '#555',
    },
    value: {
        flex: 1,
    },
    footer: {
        marginTop: 30,
        borderTopWidth: 1,
        borderTopColor: '#ccc',
        paddingTop: 10,
        fontSize: 8,
        textAlign: 'center',
        color: '#888',
    },
    paymentInfo: {
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 5,
    },
    totalPrice: {
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 5,
        textAlign: 'right',
    },
    footerLine: {
        marginTop: 2,
    },
});

type Props = {
    reservation: any; // Using any to avoid complex type casting in PDF template, but ideally typed
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
        const d = new Date(dateStr + "T00:00:00"); // Force local checks
        return format(d, "dd 'de' MMMM, yyyy", { locale: es });
    } catch (e) {
        return dateStr;
    }
};

const calculateVatBreakdown = (amountTotal?: number | null) => {
    if (!amountTotal || amountTotal <= 0) return null;
    const net = Math.round(amountTotal / 1.19);
    const vat = amountTotal - net;
    return { net, vat, total: amountTotal };
};

const formatCurrency = (amount: number) => {
    return "$" + amount.toLocaleString("es-CL");
};

export const ReservationVoucher = ({ reservation }: Props) => {
    const guest = reservation.hostal_guests || {};
    const room = reservation.hostal_rooms || {};

    // Calculate nights
    const checkIn = new Date(reservation.check_in);
    const checkOut = new Date(reservation.check_out);
    const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 0;

    // Companions
    const companions = reservation.companions_json || [];
    const totalPax = (reservation.adults || 1) + (reservation.children || 0) + companions.length;

    // Price Breakdown
    const breakdown = calculateVatBreakdown(reservation.total_price);

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* HEADER */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Hostal Loreto Belén</Text>
                        <Text style={styles.subtitle}>Comprobante de Reserva</Text>
                    </View>
                    <View>
                        <Text style={{ fontSize: 12, fontWeight: 'bold' }}>
                            {reservation.code || `Reserva #${reservation.id}`}
                        </Text>
                        <Text style={styles.subtitle}>
                            Estado: {reservation.status?.toUpperCase() || "PENDIENTE"}
                        </Text>
                    </View>
                </View>

                {/* GUEST INFO */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Datos del Huésped Principal</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Nombre:</Text>
                        <Text style={styles.value}>{guest.full_name || "Sin Nombre"}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Documento:</Text>
                        <Text style={styles.value}>{guest.document_id || "-"}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Email:</Text>
                        <Text style={styles.value}>{guest.email || "-"}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Teléfono:</Text>
                        <Text style={styles.value}>{guest.phone || "-"}</Text>
                    </View>
                </View>

                {/* RESERVATION DETAILS */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Detalles de la Reserva</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Habitación:</Text>
                        <Text style={styles.value}>{room.name || "Sin Asignar"} ({room.room_type || "Estándar"})</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Entrada (Check-in):</Text>
                        <Text style={styles.value}>{formatDate(reservation.check_in)}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Salida (Check-out):</Text>
                        <Text style={styles.value}>{formatDate(reservation.check_out)}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Duración:</Text>
                        <Text style={styles.value}>{diffDays} {diffDays === 1 ? 'Noche' : 'Noches'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Ocupación Total:</Text>
                        <Text style={styles.value}>
                            {reservation.adults} Adultos, {reservation.children} Niños
                            {companions.length > 0 ? ` (+${companions.length} Acompañantes)` : ''}
                        </Text>
                    </View>
                    {reservation.arrival_time && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Hora Llegada Estimada:</Text>
                            <Text style={styles.value}>{reservation.arrival_time}</Text>
                        </View>
                    )}
                </View>

                {/* PAYMENT INFO */}
                {(reservation.total_price > 0 || reservation.invoice_status) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Información de Pago</Text>
                        <View style={styles.row}>
                            <Text style={styles.label}>Estado Facturación:</Text>
                            <Text style={styles.value}>
                                {reservation.invoice_status === 'invoiced' ? 'Facturado / Emitido' :
                                    reservation.invoice_status === 'pending' ? 'Pendiente' :
                                        reservation.invoice_status || 'Sin Información'}
                            </Text>
                        </View>
                        {reservation.invoice_number && (
                            <View style={styles.row}>
                                <Text style={styles.label}>Nº Documento:</Text>
                                <Text style={styles.value}>{reservation.invoice_number}</Text>
                            </View>
                        )}

                        {breakdown ? (
                            <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 5 }}>
                                <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 4 }}>Resumen de montos</Text>
                                <View style={styles.row}>
                                    <Text style={styles.label}>Neto:</Text>
                                    <Text style={styles.value}>{formatCurrency(breakdown.net)}</Text>
                                </View>
                                <View style={styles.row}>
                                    <Text style={styles.label}>IVA (19%):</Text>
                                    <Text style={styles.value}>{formatCurrency(breakdown.vat)}</Text>
                                </View>
                                <View style={[styles.row, { marginTop: 4 }]}>
                                    <Text style={[styles.label, { fontSize: 12 }]}>Total c/ IVA:</Text>
                                    <Text style={[styles.value, { fontSize: 12, fontWeight: 'bold' }]}>
                                        {formatCurrency(breakdown.total)} CLP
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <Text style={styles.totalPrice}>
                                Total a Pagar: {formatCurrency(reservation.total_price)} CLP
                            </Text>
                        )}
                    </View>
                )}

                {/* NOTES */}
                {reservation.notes && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Notas</Text>
                        <Text style={{ fontSize: 9, fontStyle: 'italic' }}>{reservation.notes}</Text>
                    </View>
                )}

                {/* CONDITIONS - NEW BLOCK */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Condiciones de la estadía</Text>
                    <View>
                        <Text style={{ marginBottom: 2 }}>• Habitaciones con baño privado.</Text>
                        <Text style={{ marginBottom: 2 }}>• Incluye desayuno.</Text>
                        <Text style={{ marginBottom: 2 }}>• Incluye estacionamiento privado sin costo, sujeto a disponibilidad.</Text>
                    </View>
                </View>

                {/* FOOTER POLICIES */}
                <View style={styles.footer}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Información Importante</Text>
                    <Text>Check-in: Desde las 15:00 hrs | Check-out: Hasta las 11:00 hrs</Text>
                    <Text>Para modificaciones o cancelaciones, por favor contacte directamente con administración.</Text>
                    <Text style={styles.footerLine}>Gracias por preferir Hostal Loreto Belén</Text>
                    <Text style={styles.footerLine}>Dirección: Yungay 551</Text>
                    <Text style={styles.footerLine}>Teléfono: (61) 2 413285</Text>
                    <Text style={styles.footerLine}>Puerto Natales - Chile</Text>
                </View>

            </Page>
        </Document>
    );
};
