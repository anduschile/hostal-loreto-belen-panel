// Turnstile en POST /api/public/reservation-requests. Solo se simulan las fronteras externas:
// fetch (Cloudflare), la base (rpc) y el envío de correos.
import { test, mock, before, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

const env = process.env as Record<string, string | undefined>;
let rpcCalls = 0;
let lastRpcArgs: Record<string, unknown> | undefined;
let fetchCalls: Array<{ url: string; body: URLSearchParams }> = [];
let fetchImpl: (url: string, init: any) => Promise<Response> = async () => Response.json({ success: true });
const realFetch = globalThis.fetch;
const realConsoleError = console.error;

before(() => {
    mock.module(new URL("../src/lib/supabase/server.ts", import.meta.url).href, {
        namedExports: {
            createClient: () => ({
                rpc: async (_fn: string, args: Record<string, unknown>) => {
                    rpcCalls++;
                    lastRpcArgs = args;
                    return { data: [{ out_reservation_id: 1, out_code: "LB-00001", out_hold_expires_at: "2026-12-01T00:00:00Z" }], error: null };
                },
            }),
        },
    });
    mock.module(new URL("../src/lib/public-api/emails.ts", import.meta.url).href, {
        namedExports: { sendRequestEmails: async () => {} },
    });
});

const saved = { secret: env.TURNSTILE_SECRET_KEY, node: env.NODE_ENV, salt: env.PUBLIC_API_HASH_SALT };
beforeEach(() => {
    rpcCalls = 0;
    lastRpcArgs = undefined;
    fetchCalls = [];
    env.TURNSTILE_SECRET_KEY = "test-secret-value";
    env.NODE_ENV = "test";
    env.PUBLIC_API_HASH_SALT = "salt";
    fetchImpl = async () => Response.json({ success: true });
    globalThis.fetch = (async (url: any, init: any) => {
        fetchCalls.push({ url: String(url), body: init.body as URLSearchParams });
        return fetchImpl(String(url), init);
    }) as typeof fetch;
    console.error = () => {};
});
afterEach(() => {
    globalThis.fetch = realFetch;
    console.error = realConsoleError;
    for (const [k, v] of [["TURNSTILE_SECRET_KEY", saved.secret], ["NODE_ENV", saved.node], ["PUBLIC_API_HASH_SALT", saved.salt]] as const) {
        if (v === undefined) delete env[k]; else env[k] = v;
    }
});

const valid = {
    check_in: "2026-12-10", check_out: "2026-12-12", room_type: "doble", adults: 2,
    full_name: "Ana Perez", email: "ana@example.com", turnstile_token: "tok-123",
};
async function post(body: unknown, headers: Record<string, string> = {}) {
    const { POST } = await import("../src/app/api/public/reservation-requests/route");
    const res = await POST(new Request("http://x/api/public/reservation-requests", {
        method: "POST", headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1", ...headers }, body: JSON.stringify(body),
    }));
    return { status: res.status, json: await res.json() };
}

test("token válido: crea la solicitud y envía secret, response y remoteip a Cloudflare", async () => {
    const r = await post(valid);
    assert.equal(r.status, 201);
    assert.equal(r.json.code, "LB-00001");
    assert.equal(fetchCalls.length, 1);
    assert.equal(fetchCalls[0].url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    assert.equal(fetchCalls[0].body.get("secret"), "test-secret-value");
    assert.equal(fetchCalls[0].body.get("response"), "tok-123");
    assert.equal(fetchCalls[0].body.get("remoteip"), "203.0.113.9");
    assert.equal(rpcCalls, 1);
});

test("token ausente o vacío: 400 verificacion_requerida, sin llamar a Cloudflare ni a la base", async () => {
    const { turnstile_token: _t, ...sinToken } = valid;
    for (const body of [sinToken, { ...valid, turnstile_token: "" }, { ...valid, turnstile_token: "   " }, { ...valid, turnstile_token: 5 }]) {
        const r = await post(body);
        assert.equal(r.status, 400);
        assert.deepEqual(r.json, { error: "verificacion_requerida" });
    }
    assert.equal(fetchCalls.length, 0);
    assert.equal(rpcCalls, 0);
});

test("token rechazado: 400 verificacion_fallida y no toca la base", async () => {
    fetchImpl = async () => Response.json({ success: false, "error-codes": ["invalid-input-response"] });
    const r = await post(valid);
    assert.equal(r.status, 400);
    assert.deepEqual(r.json, { error: "verificacion_fallida" });
    assert.equal(rpcCalls, 0);
});

test("Cloudflare caído (error de red o HTTP 500): 503 verificacion_no_disponible", async () => {
    fetchImpl = async () => { throw new TypeError("fetch failed"); };
    let r = await post(valid);
    assert.equal(r.status, 503);
    assert.deepEqual(r.json, { error: "verificacion_no_disponible" });
    fetchImpl = async () => new Response("boom", { status: 500 });
    r = await post(valid);
    assert.equal(r.status, 503);
    assert.equal(rpcCalls, 0);
});

test("timeout: la consulta se aborta (plazo de 5 s) y responde 503", async () => {
    const realSetTimeout = globalThis.setTimeout;
    let ms = 0;
    // Dispara el temporizador de 5 s de inmediato.
    globalThis.setTimeout = ((fn: any, t?: number) => { ms = t ?? 0; return realSetTimeout(fn, 0); }) as typeof setTimeout;
    fetchImpl = (_u, init) => new Promise((_res, rej) => {
        init.signal.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError")));
    });
    try {
        const r = await post(valid);
        assert.equal(r.status, 503);
        assert.deepEqual(r.json, { error: "verificacion_no_disponible" });
        assert.equal(ms, 5000);
    } finally {
        globalThis.setTimeout = realSetTimeout;
    }
    assert.equal(rpcCalls, 0);
});

test("honeypot: respuesta falsa 201 sin llamar a Cloudflare ni a la base", async () => {
    const r = await post({ ...valid, website: "http://spam" });
    assert.equal(r.status, 201);
    assert.match(r.json.code, /^LB-\d{5}$/);
    assert.equal(fetchCalls.length, 0);
    assert.equal(rpcCalls, 0);
});

test("campos inválidos: 400 solicitud_invalida sin llamar a Cloudflare", async () => {
    const r = await post({ ...valid, email: "no-es-correo" });
    assert.equal(r.status, 400);
    assert.equal(r.json.error, "solicitud_invalida");
    assert.deepEqual(r.json.fields, ["email"]);
    assert.equal(fetchCalls.length, 0);
    assert.equal(rpcCalls, 0);
});

test("secreto ausente en production: 500 error_interno, sin llamar a Cloudflare ni a la base", async () => {
    delete env.TURNSTILE_SECRET_KEY;
    env.NODE_ENV = "production";
    const logs: string[] = [];
    console.error = (...a: unknown[]) => { logs.push(a.join(" ")); };
    const r = await post(valid);
    assert.equal(r.status, 500);
    assert.deepEqual(r.json, { error: "error_interno" });
    assert.equal(fetchCalls.length, 0);
    assert.equal(rpcCalls, 0);
    assert.ok(logs.some((l) => l.includes("TURNSTILE_SECRET_KEY")));
});

test("secreto ausente fuera de production: se omite la verificación (solo desarrollo)", async () => {
    delete env.TURNSTILE_SECRET_KEY;
    env.NODE_ENV = "development";
    const { turnstile_token: _t, ...sinToken } = valid;
    const r = await post(sinToken);
    assert.equal(r.status, 201);
    assert.equal(fetchCalls.length, 0);
});

test("el secreto nunca aparece en respuestas ni en logs", async () => {
    const logs: string[] = [];
    console.error = (...a: unknown[]) => { logs.push(a.join(" ")); };
    fetchImpl = async () => Response.json({ success: false, "error-codes": ["x"] });
    const r = await post(valid);
    assert.ok(!JSON.stringify(r).includes("test-secret-value"));
    assert.ok(!logs.join("\n").includes("test-secret-value"));
});

test("idempotency_key del body se reenvía al RPC como p_idempotency_key; sin clave va null", async () => {
    const key = "3f2b8c1e-9a4d-4e57-8b1a-0c6d2e7f9a10";
    const r1 = await post({ ...valid, idempotency_key: key });
    assert.equal(r1.status, 201);
    assert.equal(lastRpcArgs?.p_idempotency_key, key);
    const r2 = await post(valid);
    assert.equal(r2.status, 201);
    assert.equal(lastRpcArgs?.p_idempotency_key, null);
    const r3 = await post({ ...valid, idempotency_key: "k".repeat(65) });
    assert.equal(r3.status, 400);
    assert.equal(r3.json.error, "solicitud_invalida");
    assert.deepEqual(r3.json.fields, ["idempotency_key"]);
});
