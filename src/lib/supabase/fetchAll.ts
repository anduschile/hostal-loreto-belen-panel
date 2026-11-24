// Pagina una consulta de Supabase/PostgREST (tope de 1.000 filas por consulta) hasta agotar los resultados.
// `fetchPage(from, to)` debe ejecutar la consulta con `.range(from, to)` y un orden DETERMINISTA
// (con desempate por id), para que las páginas no se repitan ni se salten filas.

export const PAGE_SIZE = 1000;
export const MAX_ROWS = 20000;

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

export async function fetchAll<T>(
    fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
    opts: { pageSize?: number; maxRows?: number; label?: string } = {}
): Promise<T[]> {
    const pageSize = opts.pageSize ?? PAGE_SIZE;
    const maxRows = opts.maxRows ?? MAX_ROWS;
    const rows: T[] = [];

    while (rows.length < maxRows) {
        const from = rows.length;
        const to = Math.min(from + pageSize, maxRows) - 1;
        const { data, error } = await fetchPage(from, to);
        if (error) throw new Error(error.message);
        const page = data ?? [];
        rows.push(...page);
        // Una página incompleta (o vacía) significa que ya no quedan filas.
        if (page.length < to - from + 1) return rows;
    }

    console.error(
        `[fetchAll] ${opts.label ?? "consulta"}: se alcanzó el límite de seguridad de ${maxRows} filas; puede haber más resultados sin cargar`
    );
    return rows;
}
