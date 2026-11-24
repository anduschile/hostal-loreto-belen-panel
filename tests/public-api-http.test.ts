// Mapeo de errores, CORS y matcher del middleware de la API pública.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mapDbError } from "../src/lib/public-api/errors";
import { corsHeaders, getAllowedOrigins, DEFAULT_ALLOWED_ORIGINS, preflightResponse } from "../src/lib/public-api/cors";

test("mapeo de errores de la base", () => {
    assert.deepEqual(mapDbError("NO_DISPONIBLE"), { status: 409, error: "no_disponible" });
    assert.deepEqual(mapDbError("FECHAS_INVALIDAS"), { status: 400, error: "fechas_invalidas" });
    assert.deepEqual(mapDbError("ESTADIA_MUY_LARGA"), { status: 400, error: "estadia_muy_larga" });
    assert.deepEqual(mapDbError("TIPO_INVALIDO"), { status: 400, error: "tipo_invalido" });
    assert.deepEqual(mapDbError("DATOS_INVALIDOS"), { status: 400, error: "datos_invalidos" });
    assert.deepEqual(mapDbError("DEMASIADAS_SOLICITUDES"), { status: 429, error: "demasiadas_solicitudes" });
});

test("errores desconocidos dan 500 genérico sin filtrar el mensaje", () => {
    const secret = 'duplicate key value violates unique constraint "x" Key (email)=(a@b.cl)';
    const r = mapDbError(secret);
    assert.deepEqual(r, { status: 500, error: "error_interno" });
    assert.ok(!JSON.stringify(r).includes("a@b.cl"));
    assert.deepEqual(mapDbError(null), { status: 500, error: "error_interno" });
    assert.deepEqual(mapDbError(undefined), { status: 500, error: "error_interno" });
});

test("el mensaje con prefijo del driver también se reconoce", () => {
    assert.equal(mapDbError("ERROR: NO_DISPONIBLE (P0001)").status, 409);
});

test("CORS: origen permitido recibe el origen exacto", () => {
    const allowed = getAllowedOrigins(undefined, true);
    const h = corsHeaders("https://loretobelen.cl", allowed);
    assert.equal(h["Access-Control-Allow-Origin"], "https://loretobelen.cl");
    assert.equal(h["Access-Control-Allow-Methods"], "GET, POST, OPTIONS");
    assert.equal(h["Vary"], "Origin");
});

test("CORS: origen no permitido o ausente no recibe Allow-Origin", () => {
    const allowed = getAllowedOrigins(undefined, true);
    assert.equal(corsHeaders("https://evil.example", allowed)["Access-Control-Allow-Origin"], undefined);
    assert.equal(corsHeaders(null, allowed)["Access-Control-Allow-Origin"], undefined);
    assert.equal(corsHeaders("https://loretobelen.cl.evil.example", allowed)["Access-Control-Allow-Origin"], undefined);
});

test("CORS: lista por defecto, variable de entorno y localhost solo fuera de producción", () => {
    assert.deepEqual(getAllowedOrigins(undefined, true), DEFAULT_ALLOWED_ORIGINS);
    assert.ok(!getAllowedOrigins(undefined, true).includes("http://localhost:5173"));
    assert.ok(getAllowedOrigins(undefined, false).includes("http://localhost:5173"));
    assert.deepEqual(getAllowedOrigins(" https://a.cl/ , https://b.cl ", true), ["https://a.cl", "https://b.cl"]);
    assert.deepEqual(getAllowedOrigins("", true), DEFAULT_ALLOWED_ORIGINS);
});

test("preflight: 204 con CORS para origen permitido y sin CORS para otro", () => {
    delete process.env.PUBLIC_API_ALLOWED_ORIGINS;
    const ok = preflightResponse("https://www.loretobelen.cl");
    assert.equal(ok.status, 204);
    assert.equal(ok.headers.get("access-control-allow-origin"), "https://www.loretobelen.cl");
    assert.equal(ok.headers.get("access-control-allow-methods"), "GET, POST, OPTIONS");
    const no = preflightResponse("https://evil.example");
    assert.equal(no.status, 204);
    assert.equal(no.headers.get("access-control-allow-origin"), null);
});

test("middleware: solo /api/public queda abierto; /api/publicfoo y el resto siguen protegidos", () => {
    const src = readFileSync(new URL("../src/middleware.ts", import.meta.url), "utf8");
    const m = src.match(/matcher:\s*\[\s*"((?:[^"\\]|\\.)*)"/);
    assert.ok(m, "no se encontró el matcher");
    const pattern = new RegExp("^" + JSON.parse(`"${m[1]}"`) + "$");
    const protectedByMiddleware = (p: string) => pattern.test(p);

    for (const open of ["/api/public", "/api/public/", "/api/public/availability", "/api/public/reservation-requests", "/login", "/login/x"]) {
        assert.equal(protectedByMiddleware(open), false, `${open} debería estar abierto`);
    }
    for (const closed of ["/api/publicfoo", "/api/publicfoo/x", "/api/reservations", "/api/users", "/api/me", "/panel", "/panel/libro-dia", "/", "/api/x/api/public"]) {
        assert.equal(protectedByMiddleware(closed), true, `${closed} debería estar protegido`);
    }
});
