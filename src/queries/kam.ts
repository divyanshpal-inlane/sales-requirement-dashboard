import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabaseClient";

export interface KAM {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface KAMWithInstructorCount extends KAM {
  instructor_count: number;
}

export interface AssignedInstructor {
  id_instructor: string;
  name: string | null;
  phone: string | null;
  assigned_at: string;
}

const KAM_TABLE = "KAM";
const JOIN_TABLE = "kam_instructor";

const kamKeys = {
  all: ["kams"] as const,
  list: () => [...kamKeys.all, "list"] as const,
  detail: (id: string) => [...kamKeys.all, "detail", id] as const,
  assigned: (id: string) => [...kamKeys.all, "assigned", id] as const,
};

export function useKAMs() {
  return useQuery({
    queryKey: kamKeys.list(),
    queryFn: async (): Promise<KAMWithInstructorCount[]> => {
      const { data: kams, error: kamErr } = await supabase
        .from(KAM_TABLE)
        .select("*")
        .order("name", { ascending: true });
      if (kamErr) throw kamErr;

      const { data: counts, error: countErr } = await supabase
        .from(JOIN_TABLE)
        .select("kam_id");
      if (countErr) throw countErr;

      const countByKam = new Map<string, number>();
      for (const row of counts ?? []) {
        const id = (row as { kam_id: string }).kam_id;
        countByKam.set(id, (countByKam.get(id) ?? 0) + 1);
      }

      return (kams ?? []).map((k) => ({
        ...(k as KAM),
        instructor_count: countByKam.get((k as KAM).id) ?? 0,
      }));
    },
  });
}

export function useKAMAssignedInstructors(kamId: string | null) {
  return useQuery({
    queryKey: kamId ? kamKeys.assigned(kamId) : ["kams", "assigned", "none"],
    enabled: !!kamId,
    queryFn: async (): Promise<AssignedInstructor[]> => {
      if (!kamId) return [];
      const { data, error } = await supabase
        .from(JOIN_TABLE)
        .select(
          "assigned_at, Instructor:instructor_id (id_instructor, name, phone)",
        )
        .eq("kam_id", kamId);
      if (error) throw error;
      const rows = (data ?? []) as unknown as Array<{
        assigned_at: string;
        Instructor:
          | { id_instructor: string; name: string | null; phone: string | null }
          | {
              id_instructor: string;
              name: string | null;
              phone: string | null;
            }[]
          | null;
      }>;
      return rows
        .map((r) => {
          const i = Array.isArray(r.Instructor)
            ? r.Instructor[0]
            : r.Instructor;
          if (!i) return null;
          return {
            id_instructor: i.id_instructor,
            name: i.name,
            phone: i.phone,
            assigned_at: r.assigned_at,
          };
        })
        .filter((x): x is AssignedInstructor => !!x)
        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    },
  });
}

export function useCreateKAM() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      phone?: string | null;
      email?: string | null;
    }): Promise<KAM> => {
      const { data, error } = await supabase
        .from(KAM_TABLE)
        .insert({
          name: input.name.trim(),
          phone: input.phone?.trim() || null,
          email: input.email?.trim() || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as KAM;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kamKeys.list() });
    },
  });
}

export function useUpdateKAM() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      phone?: string | null;
      email?: string | null;
    }): Promise<KAM> => {
      const patch: Record<string, unknown> = {};
      if (input.name !== undefined) patch.name = input.name.trim();
      if (input.phone !== undefined) patch.phone = input.phone?.trim() || null;
      if (input.email !== undefined) patch.email = input.email?.trim() || null;

      const { data, error } = await supabase
        .from(KAM_TABLE)
        .update(patch)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as KAM;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kamKeys.list() });
    },
  });
}

export function useDeleteKAM() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(KAM_TABLE).delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: kamKeys.list() });
      queryClient.removeQueries({ queryKey: kamKeys.assigned(id) });
    },
  });
}

export function useAssignInstructorsToKAM() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { kamId: string; instructorIds: string[] }) => {
      if (input.instructorIds.length === 0) return;
      const rows = input.instructorIds.map((instructor_id) => ({
        kam_id: input.kamId,
        instructor_id,
      }));
      const { error } = await supabase
        .from(JOIN_TABLE)
        .upsert(rows, { onConflict: "kam_id,instructor_id" });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: kamKeys.assigned(vars.kamId),
      });
      queryClient.invalidateQueries({ queryKey: kamKeys.list() });
    },
  });
}

export function useUnassignInstructorFromKAM() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { kamId: string; instructorId: string }) => {
      const { error } = await supabase
        .from(JOIN_TABLE)
        .delete()
        .eq("kam_id", input.kamId)
        .eq("instructor_id", input.instructorId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: kamKeys.assigned(vars.kamId),
      });
      queryClient.invalidateQueries({ queryKey: kamKeys.list() });
    },
  });
}

export interface InstructorOption {
  id_instructor: string;
  name: string | null;
  phone: string | null;
}

export function useAllInstructorsForAssignment() {
  return useQuery({
    queryKey: ["instructors", "assignment-picker"],
    queryFn: async (): Promise<InstructorOption[]> => {
      const { data, error } = await supabase
        .from("Instructor")
        .select("id_instructor, name, phone")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as InstructorOption[];
    },
    staleTime: 60_000,
  });
}
