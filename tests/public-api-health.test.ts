// GET /api/public/health: solo se simula la base (cliente de Supabase).
import { test, mock, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

let behavior: "ok" | "error" | "throw" = "ok";
let lastCall: { table?: string; cols?: string; limit?: number } = {};

before(() => {
    mock.module(new URL("../src/lib/supabase/server.ts", import.meta.url).href, {
        namedExports: {
            createClient: () => ({
                from: (table: string) => ({
                    select: (cols: string) => ({
                        limit: async (n: number) => {
                            lastCall = { table, cols, limit: n };
                            if (behavior === "throw") throw new Error("conexion caida");
                            if (behavior === "error") return { data: null, error: { code: "08006", message: "secreto-interno" } };
                            return { data: [{ id: 1 }], error: null };
                        },
                    }),
                }),
            }),
        },
    });
});
beforeEach(() => { behavior = "ok"; lastCall = {}; });

async function get(headers: Record<string, string> = {}) {
    const { GET } = await import("../src/app/api/public/health/route");
    const res = await GET(new Request("http://x/api/public/health", { headers }));
    return { status: res.status, json: await res.json(), res };
}

test("base responde: 200 { ok: true } con consulta mínima a hostal_rooms", async () => {
    const r = await get();
    assert.equal(r.status, 200);
    assert.deepEqual(r.json, { ok: true });
    assert.deepEqual(lastCall, { table: "hostal_rooms", cols: "id", limit: 1 });
});

test("la base devuelve error: 503 { ok: false } sin filtrar el mensaje", async () => {
    behavior = "error";
    const origError = console.error; console.error = () => {};
    try {
        const r = await get();
        assert.equal(r.status, 503);
        assert.deepEqual(r.json, { ok: false });
        assert.ok(!JSON.stringify(r.json).includes("secreto-interno"));
    } finally { console.error = origError; }
});

test("excepción de conexión: 503 { ok: false }", async () => {
    behavior = "throw";
    const origError = console.error; console.error = () => {};
    try {
        const r = await get();
        assert.equal(r.status, 503);
        assert.deepEqual(r.json, { ok: false });
    } finally { console.error = origError; }
});

test("CORS: mismo patrón que las otras rutas públicas", async () => {
    const r = await get({ origin: "http://localhost:3000" });
    const { OPTIONS } = await import("../src/app/api/public/health/route");
    const pre = await OPTIONS(new Request("http://x/api/public/health", { method: "OPTIONS", headers: { origin: "http://localhost:3000" } }));
    assert.equal(r.res.headers.get("access-control-allow-origin"), pre.headers.get("access-control-allow-origin"));
});
