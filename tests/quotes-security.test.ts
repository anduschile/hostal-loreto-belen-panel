// Prueba las guardas REALES (requireUser/requireRole + rutas). Solo se simulan las fronteras externas:
// cookies de Next, la sesión de Supabase Auth, la lectura de hostal_users y el repositorio/envío
// (estos últimos lanzan error si se alcanzan: una ruta rechazada NUNCA debe llegar a ellos).
import { test, mock, before } from "node:test";
import assert from "node:assert/strict";

type Sess = { user: { id: string } | null; profile: { role: string; full_name: string; is_active: boolean } | null };
const state: Sess = { user: null, profile: null };
let reached = 0;

const boom = () => { reached++; throw new Error("ALCANZÓ EL REPOSITORIO"); };

before(() => {
    mock.module("next/headers", { namedExports: { cookies: async () => ({ getAll: () => [], set: () => {} }) } });
    mock.module("@supabase/ssr", {
        namedExports: { createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: state.user }, error: null }) } }) },
    });
    mock.module(new URL("../src/lib/supabase/server.ts", import.meta.url).href, {
        namedExports: {
            createClient: () => ({
                from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.profile, error: null }) }) }) }),
            }),
        },
    });
    mock.module(new URL("../src/lib/quotes/repository.ts", import.meta.url).href, {
        namedExports: {
            getRates: boom, saveRates: boom, getSettings: boom, saveSettings: boom, listQuotes: boom,
            supabaseQuoteRepo: new Proxy({}, { get: () => boom }),
        },
    });
    mock.module(new URL("../src/lib/quotes/deps.ts", import.meta.url).href, {
        namedExports: { quoteDeps: new Proxy({}, { get: () => boom }) },
    });
});

const req = (body?: unknown) => new Request("http://x/api", { method: "POST", body: body ? JSON.stringify(body) : undefined });
const params = { params: Promise.resolve({ id: "1" }) };

async function handlers() {
    const rates = await import("../src/app/api/quote-rates/route");
    const settings = await import("../src/app/api/quote-settings/route");
    const quotes = await import("../src/app/api/quotes/route");
    const quote = await import("../src/app/api/quotes/[id]/route");
    const send = await import("../src/app/api/quotes/[id]/send/route");
    const ctx = await import("../src/app/api/quotes/context/route");
    const pdf = await import("../src/app/api/quotes/[id]/pdf/route");
    return {
        admin: {
            "GET quote-rates": () => rates.GET(), "PUT quote-rates": () => rates.PUT(req({ doble: 1 })),
            "GET quote-settings": () => settings.GET(), "PUT quote-settings": () => settings.PUT(req({ mode: "automatico" })),
        } as Record<string, () => Promise<Response>>,
        panel: {
            "GET quotes": () => quotes.GET(), "POST quotes": () => quotes.POST(req({})),
            "GET quotes/context": () => ctx.GET(),
            "GET quotes/[id]": () => quote.GET(req(), params), "PATCH quotes/[id]": () => quote.PATCH(req({ status: "aceptada" }), params),
            "POST quotes/[id]/send": () => send.POST(req(), params),
            "PUT quotes/[id]": () => quote.PUT(req({}), params), "DELETE quotes/[id]": () => quote.DELETE(req(), params),
            "GET quotes/[id]/pdf": () => pdf.GET(req(), params),
        } as Record<string, () => Promise<Response>>,
    };
}

const setSession = (user: Sess["user"], profile: Sess["profile"]) => { state.user = user; state.profile = profile; reached = 0; };
const U = { id: "u1" };

test("sin sesión: TODAS las rutas responden 401 y no tocan datos", async () => {
    const h = await handlers();
    setSession(null, null);
    for (const [name, fn] of Object.entries({ ...h.admin, ...h.panel })) {
        assert.equal((await fn()).status, 401, name);
    }
    assert.equal(reached, 0);
});

test("sesión sin fila en hostal_users: 403 en todas", async () => {
    const h = await handlers();
    setSession(U, null);
    for (const [name, fn] of Object.entries({ ...h.admin, ...h.panel })) assert.equal((await fn()).status, 403, name);
    assert.equal(reached, 0);
});

test("usuario inactivo: 403 en todas", async () => {
    const h = await handlers();
    setSession(U, { role: "superadmin", full_name: "X", is_active: false });
    for (const [name, fn] of Object.entries({ ...h.admin, ...h.panel })) assert.equal((await fn()).status, 403, name);
    assert.equal(reached, 0);
});

for (const role of ["recepcion", "housekeeping"]) {
    test(`rol ${role}: quote-rates y quote-settings rechazan (403), en todos los métodos`, async () => {
        const h = await handlers();
        setSession(U, { role, full_name: "X", is_active: true });
        for (const [name, fn] of Object.entries(h.admin)) assert.equal((await fn()).status, 403, name);
        assert.equal(reached, 0);
    });
}

test("rol recepcion SÍ pasa la guarda de las rutas de cotizaciones", async () => {
    const h = await handlers();
    setSession(U, { role: "recepcion", full_name: "X", is_active: true });
    for (const [name, fn] of Object.entries(h.panel)) {
        const r = await fn();
        assert.ok(r.status !== 401 && r.status !== 403, `${name} -> ${r.status}`);
    }
    assert.ok(reached > 0); // llegó al repositorio simulado
});

test("superadmin pasa la guarda de quote-rates y quote-settings", async () => {
    const h = await handlers();
    setSession(U, { role: "superadmin", full_name: "X", is_active: true });
    for (const [name, fn] of Object.entries(h.admin)) {
        const r = await fn();
        assert.ok(r.status !== 401 && r.status !== 403, `${name} -> ${r.status}`);
    }
});
