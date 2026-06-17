import { z } from "zod";

export const MenuSchema = z
  .object({
    nombre: z.string().min(1, "El nombre del menú es obligatorio"),
    descripcion: z.string().nullish(),
    foto_url: z.string().nullish(),
    ingredientes: z.string().nullish(),
    is_active: z.boolean().default(true),
  })
  .passthrough();

export const MenuUpdateSchema = MenuSchema.extend({
  id: z.number().int(),
}).passthrough();

export const MenuPriceSchema = z
  .object({
    menu_id: z.number().int().positive("Menu ID debe ser positivo"),
    company_id: z.number().int().positive("Company ID debe ser positivo").nullish(),
    tipo_servicio: z.enum(["almuerzo", "cena"]),
    precio: z.number().nonnegative("El precio no puede ser negativo"),
    vigente_desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido"),
    is_active: z.boolean().default(true),
  })
  .passthrough();

export const MenuPriceUpdateSchema = z
  .object({
    id: z.number().int(),
    precio: z.number().nonnegative("El precio no puede ser negativo"),
    is_active: z.boolean().optional(),
  })
  .passthrough();

export type MenuInput = z.infer<typeof MenuSchema>;
export type MenuUpdateInput = z.infer<typeof MenuUpdateSchema>;
export type MenuPriceInput = z.infer<typeof MenuPriceSchema>;
export type MenuPriceUpdateInput = z.infer<typeof MenuPriceUpdateSchema>;
