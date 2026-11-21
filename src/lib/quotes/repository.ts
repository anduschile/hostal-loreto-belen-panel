import { createClient } from "../supabase/server";
import { emptyRates, OCCUPANCIES, DEFAULT_CONDITIONS, DEFAULT_VALIDITY_DAYS, type RateTable } from "./calc";
import type { QuoteRepo, QuoteRow, QuoteSettings } from "./service";

const DEFAULT_SETTINGS: QuoteSettings = {
    validity_days: DEFAULT_VALIDITY_DAYS,
    validity_provisional: true,
    mode: "revision",
    default_conditions: DEFAULT_CONDITIONS,
};

export async function getRates(): Promise<RateTable> {
    const { data, error } = await createClient().from("hostal_quote_rates").select("occupancy, net_rate");
    if (error) throw new Error(error.message);
    const rates = emptyRates();
    for (const r of data ?? []) {
        if ((OCCUPANCIES as readonly string[]).includes(r.occupancy)) rates[r.occupancy as keyof RateTable] = r.net_rate ?? 0;
    }
    return rates;
}

export async function saveRates(rates: Partial<RateTable>) {
    const rows = OCCUPANCIES.filter((o) => rates[o] !== undefined).map((o) => ({
        occupancy: o,
        net_rate: Math.max(0, Math.round(Number(rates[o]) || 0)),
        updated_at: new Date().toISOString(),
    }));
    const { error } = await createClient().from("hostal_quote_rates").upsert(rows, { onConflict: "occupancy" });
    if (error) throw new Error(error.message);
}

export async function getSettings(): Promise<QuoteSettings> {
    const { data, error } = await createClient().from("hostal_quote_settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? { ...DEFAULT_SETTINGS, ...data } : DEFAULT_SETTINGS;
}

export async function saveSettings(patch: Partial<QuoteSettings>) {
    const clean: Record<string, unknown> = { id: 1, updated_at: new Date().toISOString() };
    if (patch.validity_days !== undefined) {
        const v = Math.floor(Number(patch.validity_days));
        if (!(v > 0)) throw new Error("La vigencia debe ser de 1 día o más.");
        clean.validity_days = v;
        clean.validity_provisional = false; // al editarla deja de ser provisional
    }
    if (patch.mode !== undefined) {
        if (patch.mode !== "automatico" && patch.mode !== "revision") throw new Error("Modo no válido.");
        clean.mode = patch.mode;
    }
    if (patch.default_conditions !== undefined) clean.default_conditions = String(patch.default_conditions);
    const { error } = await createClient().from("hostal_quote_settings").upsert(clean, { onConflict: "id" });
    if (error) throw new Error(error.message);
}

export const supabaseQuoteRepo: QuoteRepo = {
    getRates,
    getSettings,
    async getCompanyDiscount(companyId) {
        const { data, error } = await createClient()
            .from("hostal_companies")
            .select("discount_type, discount_value")
            .eq("id", companyId)
            .maybeSingle();
        if (error) throw new Error(error.message);
        return data ? { discount_type: data.discount_type ?? "ninguno", discount_value: Number(data.discount_value) || 0 } : null;
    },
    async insertQuote(row) {
        const { data, error } = await createClient().from("hostal_quotes").insert(row).select("*").single();
        if (error) throw new Error(error.message);
        return data as QuoteRow;
    },
    async getQuote(id) {
        const { data, error } = await createClient().from("hostal_quotes").select("*").eq("id", id).maybeSingle();
        if (error) throw new Error(error.message);
        return (data as QuoteRow) ?? null;
    },
    async updateQuote(id, patch) {
        const { data, error } = await createClient()
            .from("hostal_quotes")
            .update({ ...patch, updated_at: new Date().toISOString() })
            .eq("id", id)
            .select("*")
            .single();
        if (error) throw new Error(error.message);
        return data as QuoteRow;
    },
};

export async function listQuotes(): Promise<QuoteRow[]> {
    const { data, error } = await createClient().from("hostal_quotes").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as QuoteRow[];
}
