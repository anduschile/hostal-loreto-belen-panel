import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchAll } from "../src/lib/supabase/fetchAll";

// Fuente simulada con N filas; registra los rangos pedidos.
function source(total: number) {
    const calls: Array<[number, number]> = [];
    const fetchPage = async (from: number, to: number) => {
        calls.push([from, to]);
        const data: number[] = [];
        for (let i = from; i <= Math.min(to, total - 1); i++) data.push(i);
        return { data, error: null };
    };
    return { calls, fetchPage };
}

test("varios bloques: junta todas las filas en orden", async () => {
    const s = source(2466);
    const rows = await fetchAll(s.fetchPage);
    assert.equal(rows.length, 2466);
    assert.equal(rows[0], 0);
    assert.equal(rows[2465], 2465);
    assert.deepEqual(s.calls, [[0, 999], [1000, 1999], [2000, 2999]]);
});

test("menos de un bloque: una sola consulta", async () => {
    const s = source(10);
    assert.equal((await fetchAll(s.fetchPage)).length, 10);
    assert.equal(s.calls.length, 1);
});

test("bloque exacto de 1.000: pide uno más y termina sin duplicar", async () => {
    const s = source(1000);
    const rows = await fetchAll(s.fetchPage);
    assert.equal(rows.length, 1000);
    assert.deepEqual(s.calls, [[0, 999], [1000, 1999]]);
});

test("sin filas", async () => {
    assert.deepEqual(await fetchAll(source(0).fetchPage), []);
});

test("límite de seguridad: corta y lo informa en el log", async () => {
    const s = source(50000);
    const logged: string[] = [];
    const orig = console.error;
    console.error = (...a: unknown[]) => { logged.push(a.join(" ")); };
    try {
        const rows = await fetchAll(s.fetchPage, { maxRows: 3000, label: "prueba" });
        assert.equal(rows.length, 3000);
    } finally {
        console.error = orig;
    }
    assert.equal(s.calls.length, 3);
    assert.equal(logged.length, 1);
    assert.match(logged[0], /prueba.*3000/);
});

test("el límite no se informa si los datos terminan antes", async () => {
    const logged: string[] = [];
    const orig = console.error;
    console.error = (...a: unknown[]) => { logged.push(a.join(" ")); };
    try {
        await fetchAll(source(2500).fetchPage, { maxRows: 3000 });
    } finally {
        console.error = orig;
    }
    assert.equal(logged.length, 0);
});

test("un error de la base se propaga", async () => {
    await assert.rejects(
        fetchAll(async () => ({ data: null, error: { message: "boom" } })),
        /boom/
    );
});
