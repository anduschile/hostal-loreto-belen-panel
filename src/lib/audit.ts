import { supabase } from "@/lib/supabaseClient";

type AuditLogParams = {
    tableName: string;
    recordId: number;
    action: "INSERT" | "UPDATE" | "DELETE";
    oldData?: any;
    newData?: any;
    userId?: string;
};

export async function logAudit({
    tableName,
    recordId,
    action,
    oldData,
    newData,
    userId,
}: AuditLogParams) {
    try {
        await supabase.from("hostal_audit").insert({
            table_name: tableName,
            record_id: recordId,
            action,
            old_data: oldData ? JSON.stringify(oldData) : null,
            new_data: newData ? JSON.stringify(newData) : null,
            user_id: userId || null,
        });
    } catch (error) {
        console.error("Error logging audit:", error);
        // No lanzamos error para no interrumpir el flujo principal si falla la auditoría
    }
}
