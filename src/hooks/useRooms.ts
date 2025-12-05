// src/hooks/useRooms.ts
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { HostalRoom } from "@/types/hostal";

interface UseRoomsResult {
  rooms: HostalRoom[];
  loading: boolean;
  error: string | null;
}

export function useRooms(): UseRoomsResult {
  const [rooms, setRooms] = useState<HostalRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRooms() {
      console.log("[useRooms] Cargando habitaciones desde Supabase...");
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("hostal_rooms")
        .select("*")
        .order("id", { ascending: true });

      console.log("[useRooms] Resultado Supabase:", { data, error });

      if (error) {
        console.error("Error cargando habitaciones:", error);
        setError(error.message);
      } else {
        setRooms((data || []) as HostalRoom[]);
      }

      setLoading(false);
    }

    fetchRooms();
  }, []);

  return { rooms, loading, error };
}
