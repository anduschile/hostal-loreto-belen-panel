// Referencia anónima del cliente (p_client_ref).
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeClientRef, getClientIp, getSalt, MissingSaltError } from "../src/lib/public-api/clientRef";

const headers = (h: Record<string, string>) => ({ get: (n: string) => h[n.toLowerCase()] ?? null });

test("mismo IP y sal dan el mismo valor de 32 caracteres hex", () => {
    const a = computeClientRef("203.0.113.7", "sal-1");
    assert.equal(a, computeClientRef("203.0.113.7", "sal-1"));
    assert.match(a, /^[0-9a-f]{32}$/);
});

test("distinta sal o distinta IP dan distinto valor", () => {
    assert.notEqual(computeClientRef("203.0.113.7", "sal-1"), computeClientRef("203.0.113.7", "sal-2"));
    assert.notEqual(computeClientRef("203.0.113.7", "sal-1"), computeClientRef("203.0.113.8", "sal-1"));
});

test("no contiene la IP", () => {
    const ref = computeClientRef("203.0.113.7", "sal-1");
    assert.ok(!ref.includes("203"));
    assert.ok(!ref.includes("113"));
});

test("IP: primer valor de x-forwarded-for, luego x-real-ip, luego unknown", () => {
    assert.equal(getClientIp(headers({ "x-forwarded-for": " 1.2.3.4 , 10.0.0.1" })), "1.2.3.4");
    assert.equal(getClientIp(headers({ "x-real-ip": "5.6.7.8" })), "5.6.7.8");
    assert.equal(getClientIp(headers({})), "unknown");
});

test("sal: obligatoria en producción, con valor local en desarrollo", () => {
    assert.throws(() => getSalt({ NODE_ENV: "production" }), MissingSaltError);
    assert.equal(getSalt({ NODE_ENV: "production", PUBLIC_API_HASH_SALT: "abc" }), "abc");
    assert.ok(getSalt({ NODE_ENV: "development" }).length > 0);
});
