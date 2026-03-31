// Re-export generated Supabase types from the canonical source
// To regenerate: supabase gen types typescript --project-id uqfgdezadpkiadugufbs > types/supabase.ts
export type { Database, Json } from "@/types/supabase"

// Convenience type helpers
export type Tables<T extends keyof import("@/types/supabase").Database["public"]["Tables"]> =
  import("@/types/supabase").Database["public"]["Tables"][T]["Row"]

export type TablesInsert<T extends keyof import("@/types/supabase").Database["public"]["Tables"]> =
  import("@/types/supabase").Database["public"]["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof import("@/types/supabase").Database["public"]["Tables"]> =
  import("@/types/supabase").Database["public"]["Tables"][T]["Update"]

export type Enums<T extends keyof import("@/types/supabase").Database["public"]["Enums"]> =
  import("@/types/supabase").Database["public"]["Enums"][T]
