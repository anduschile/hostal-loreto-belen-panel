import { z } from "zod";

const refineMenus = (data: z.infer<typeof MealServiceBase>, ctx: z.RefinementCtx) => {
  if (data.menu_a_id === data.menu_b_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "El menú A y el menú B deben ser diferentes",
      path: ["menu_b_id"],
    });
  }
};

const MealServiceBase = z
  .object({
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido"),
    tipo_servicio: z.enum(["almuerzo", "cena"]),
    menu_a_id: z.number().int().positive("Menu A ID debe ser positivo"),
    menu_b_id: z.number().int().positive("Menu B ID debe ser positivo"),
    notas: z.string().nullish(),
    created_by: z.number().int().nullish(),
  })
  .passthrough();

export const MealServiceSchema = MealServiceBase.superRefine(refineMenus);

export const MealServiceUpdateSchema = MealServiceBase.extend({
  id: z.number().int(),
}).superRefine(refineMenus);

export type MealServiceInput = z.infer<typeof MealServiceSchema>;
export type MealServiceUpdateInput = z.infer<typeof MealServiceUpdateSchema>;
