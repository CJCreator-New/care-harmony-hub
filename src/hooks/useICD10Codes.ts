import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ICD10Code } from "@/types/icd10";

export function useICD10Codes(searchTerm: string, category?: string) {
  return useQuery({
    queryKey: ["icd10-codes", searchTerm, category],
    queryFn: async () => {
      let query = supabase
        .from("icd10_codes")
        .select("*")
        .order("code");

      // Search by code or description
      if (searchTerm && searchTerm.length >= 2) {
        query = query.or(
          `code.ilike.%${searchTerm}%,short_description.ilike.%${searchTerm}%,long_description.ilike.%${searchTerm}%`
        );
      }

      // Filter by category
      if (category) {
        query = query.eq("category", category);
      }

      // Limit results for performance
      query = query.limit(50);

      const { data, error } = await query;

      if (error) throw error;
      return data as ICD10Code[];
    },
    enabled: searchTerm.length >= 2 || !!category,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

export function useICD10Categories() {
  return useQuery({
    queryKey: ["icd10-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("icd10_codes")
        .select("category")
        .not("category", "is", null);

      if (error) throw error;

      // Get unique categories
      const categories = [...new Set(data.map((d) => d.category))].filter(Boolean).sort();
      return categories as string[];
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });
}

export function useICD10CodeByCode(code: string) {
  return useQuery({
    queryKey: ["icd10-code", code],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("icd10_codes")
        .select("*")
        .eq("code", code)
        .single();

      if (error) throw error;
      return data as ICD10Code;
    },
    enabled: !!code,
  });
}
