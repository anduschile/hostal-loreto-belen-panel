// Las consultas del panel que leen rangos largos deben paginar (tope de 1.000 filas por consulta de PostgREST).
// Solo se simula el cliente de Supabase: cada tabla devuelve sus filas, con el mismo tope de 1.000 que el
// servidor real cuando la consulta no usa .range() (así una consulta sin paginar se vería truncada).
import { test, mock, before } from "node:test";
import assert from "node:assert/strict";

const SERVER_CAP = 1000;
let tables: Record<string, any[]> = {};
const rangesAsked: Record<string, Array<[number, number]>> = {};

function builder(table: string) {
    let range: [number, number] | null = null;
    let head = false;
    const result = () => {
        const rows = tables[table] ?? [];
        if (head) return { data: null, count: rows.length, error: null };
        if (range) {
            (rangesAsked[table] ??= []).push(range);
            return { data: rows.slice(range[0], Math.min(range[1], range[0] + SERVER_CAP - 1) + 1), error: null };
        }
        return { data: rows.slice(0, SERVER_CAP), error: null };
    };
    const b: any = new Proxy(function () {}, {
        get(_t, prop) {
            if (prop === "then") return (res: any, rej: any) => Promise.resolve(result()).then(res, rej);
            if (prop === "range") return (f: number, t: number) => { range = [f, t]; return b; };
            if (prop === "select") return (_c?: string, opts?: { head?: boolean }) => { if (opts?.head) head = true; return b; };
            return () => b; // eq, gte, lt, order, in, neq, not...
        },
    });
    return b;
}

before(() => {
    mock.module(new URL("../src/lib/supabase/server.ts", import.meta.url).href, {
        namedExports: { createClient: () => ({ from: (t: string) => builder(t) }) },
    });
});

const reset = (t: Record<string, any[]>) => {
    tables = t;
    for (const k of Object.keys(rangesAsked)) delete rangesAsked[k];
};
const quiet = () => { console.log = () => {}; };

// ---------- stats.ts ----------
const payRows = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ amount: 100, payment_date: "2026-03-05", method: i % 2 ? "efectivo" : "tarjeta", document_type: "boleta" }));
const resRows = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
        id: i + 1, check_in: "2026-03-01", check_out: "2026-03-03", room_id: (i % 12) + 1, status: "confirmed",
        total_price: 10, company_id: 7, billing_type: "empresa", company_name_snapshot: "ACME", hostal_companies: null,
    }));

test("stats: con 2.500 pagos y 2.500 reservas no se trunca en 1.000", async () => {
    reset({ hostal_payments: payRows(2500), hostal_rooms: Array(12).fill({}), hostal_reservations: resRows(2500) });
    const { getDashboardStats } = await import("../src/lib/data/stats");
    const s = await getDashboardStats({ fromDate: "2026-03-01", toDate: "2026-03-05" });
    assert.equal(s.financial.transaction_count, 2500);
    assert.equal(s.financial.total_income, 250000);
    assert.equal(s.top_companies[0].reservation_count, 2500);
    assert.equal(s.top_companies[0].total_revenue, 25000);
});

test("stats: pocas filas => mismo resultado que antes y una sola consulta por tabla", async () => {
    reset({ hostal_payments: payRows(3), hostal_rooms: Array(12).fill({}), hostal_reservations: resRows(2) });
    const { getDashboardStats } = await import("../src/lib/data/stats");
    const s = await getDashboardStats({ fromDate: "2026-03-01", toDate: "2026-03-02" });
    assert.equal(s.financial.transaction_count, 3);
    assert.equal(s.financial.total_income, 300);
    assert.deepEqual(s.financial.income_by_method, [{ method: "tarjeta", amount: 200 }, { method: "efectivo", amount: 100 }]);
    assert.deepEqual(s.financial.daily_income, [{ date: "2026-03-01", amount: 0 }, { date: "2026-03-02", amount: 0 }]);
    assert.equal(s.occupancy.daily_occupancy[0].occupied, 2);
    assert.deepEqual(s.top_companies, [{ id: 7, name: "ACME", total_revenue: 20, reservation_count: 2 }]);
    assert.equal(rangesAsked["hostal_payments"].length, 1);
    assert.equal(rangesAsked["hostal_reservations"].length, 1);
});

test("stats detallado: 2.500 reservas llegan a all_companies y a ocupación por tipo", async () => {
    reset({
        hostal_payments: [],
        hostal_rooms: Array.from({ length: 12 }, (_, i) => ({ id: i + 1, room_type: "doble" })),
        hostal_reservations: resRows(2500),
    });
    const { getDetailedStats } = await import("../src/lib/data/stats");
    const s = await getDetailedStats({ fromDate: "2026-03-01", toDate: "2026-03-01" });
    assert.equal(s.all_companies[0].reservation_count, 2500);
    assert.equal(s.occupancy_by_room_type[0].occupied, 12); // 12 habitaciones distintas, 1 noche
});

// ---------- payments.ts ----------
test("getPayments: 2.500 pagos completos; con pocos, mapeo idéntico", async () => {
    const mk = (n: number) => Array.from({ length: n }, (_, i) => ({
        id: i + 1, reservation_id: 5, amount: 50, method: "efectivo", payment_date: "2026-03-05",
        hostal_reservations: { id: 5, billing_type: "empresa", company_name_snapshot: "ACME", hostal_guests: { full_name: "Ana" }, hostal_companies: null },
    }));
    const { getPayments } = await import("../src/lib/data/payments");
    reset({ hostal_payments: mk(2500) });
    assert.equal((await getPayments({ fromDate: "2026-01-01", toDate: "2026-12-31" })).length, 2500);
    reset({ hostal_payments: mk(2) });
    const small = await getPayments();
    assert.equal(small.length, 2);
    assert.equal(small[0].guest_name, "Ana");
    assert.equal(small[0].company_name, "ACME");
    assert.equal(small[0].billing_type, "empresa");
    assert.equal(small[0].currency, "CLP");
    assert.equal(rangesAsked["hostal_payments"].length, 1);
});

// ---------- dashboard.ts ----------
test("dashboard: el ingreso del mes suma más de 1.000 pagos", async () => {
    reset({ hostal_rooms: [], hostal_reservations: [], hostal_payments: Array.from({ length: 2500 }, () => ({ amount: 10 })) });
    const { getDashboardStats } = await import("../src/lib/data/dashboard");
    assert.equal((await getDashboardStats("2026-03-15")).monthlyIncome, 25000);
    reset({ hostal_rooms: [], hostal_reservations: [], hostal_payments: [{ amount: 10 }, { amount: null }, { amount: 5 }] });
    assert.equal((await getDashboardStats("2026-03-15")).monthlyIncome, 15);
});

// ---------- calendar.ts ----------
test("calendario: 2.500 reservas y, con pocas, el mismo mapeo", async () => {
    quiet();
    const mk = (n: number) => Array.from({ length: n }, (_, i) => ({
        id: i + 1, room_id: 1, guest_id: 1, company_id: null, check_in: "2026-03-01", check_out: "2026-03-02", status: "confirmed",
        total_price: 1, adults: null, children: null, hostal_guests: { full_name: "Ana" }, hostal_companies: null,
    }));
    const { getCalendarData } = await import("../src/lib/data/calendar");
    reset({ hostal_rooms: [{ id: 1, name: "101", room_type: "doble", capacity_adults: 2, status: "disponible" }], hostal_reservations: mk(2500) });
    assert.equal((await getCalendarData("2026-03-01", "2026-03-31")).reservations.length, 2500);
    reset({ hostal_rooms: [{ id: 1, name: "101", room_type: "doble", capacity_adults: 2, status: "disponible" }], hostal_reservations: mk(1) });
    const d = await getCalendarData("2026-03-01", "2026-03-31");
    assert.equal(d.reservations.length, 1);
    assert.equal(d.reservations[0].guest_name, "Ana");
    assert.equal(d.reservations[0].adults, 1);
    assert.equal(d.reservations[0].children, 0);
    assert.equal(d.rooms[0].capacity, 2);
});

// ---------- /api/guests-log ----------
test("guests-log: 2.500 reservas por check_in; con pocas, la misma respuesta", async () => {
    const { GET } = await import("../src/app/api/guests-log/route");
    const mk = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1, check_in: "2026-03-01" }));
    reset({ hostal_reservations: mk(2500) });
    const big = await (await GET(new Request("http://x/api/guests-log?from=2026-01-01&to=2026-12-31"))).json();
    assert.equal(big.length, 2500);
    reset({ hostal_reservations: mk(2) });
    assert.deepEqual(await (await GET(new Request("http://x/api/guests-log?from=2026-01-01&to=2026-12-31"))).json(), mk(2));
    reset({});
    assert.deepEqual(await (await GET(new Request("http://x/api/guests-log?from=a&to=b"))).json(), []);
    assert.equal((await GET(new Request("http://x/api/guests-log"))).status, 400);
});

// ---------- meal-report.ts ----------
test("reporte de comidas: 2.500 servicios y 2.500 consumos completos; con pocos, mismo mapeo", async () => {
    const { getMealReportData, getMealReportSummary } = await import("../src/lib/data/meal-report");
    const cons = (n: number) => Array.from({ length: n }, (_, i) => ({
        id: i + 1, meal_service_id: 1, eleccion: "A", precio_snapshot: 1000,
        hostal_meal_services: { fecha: "2026-03-01", tipo_servicio: "almuerzo", menu_a_id: 3, menu_b_id: 4 },
        hostal_guests: { full_name: "Ana" }, hostal_companies: { name: "ACME" },
    }));
    reset({ hostal_meal_services: Array.from({ length: 2500 }, (_, i) => ({ id: i + 1 })), hostal_meal_consumption: cons(2500), hostal_menus: [{ id: 3, nombre: "Pollo" }] });
    assert.equal((await getMealReportData("2026-01-01", "2026-12-31")).length, 2500);
    assert.equal((await getMealReportSummary("2026-01-01", "2026-12-31"))[0].almuerzos_qty, 2500);

    reset({ hostal_meal_services: [{ id: 1 }], hostal_meal_consumption: cons(2), hostal_menus: [{ id: 3, nombre: "Pollo" }] });
    const rows = await getMealReportData("2026-03-01", "2026-03-01");
    assert.deepEqual(rows[0], {
        fecha: "2026-03-01", guest_full_name: "Ana", company_name: "ACME", tipo_servicio: "almuerzo",
        menu_nombre: "Pollo", precio: 1000, precio_con_iva: 1190, eleccion: "A",
    });
    assert.deepEqual(await getMealReportSummary("2026-03-01", "2026-03-01"), [
        { company_name: "ACME", almuerzos_qty: 2, cenas_qty: 0, total_almuerzos: 2000, total_cenas: 0, total_general: 2000 },
    ]);
    reset({ hostal_meal_services: [] });
    assert.deepEqual(await getMealReportData("2026-03-01", "2026-03-01"), []);
});
