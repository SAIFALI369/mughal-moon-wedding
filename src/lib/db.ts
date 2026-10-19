import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as typedClient } from "@/integrations/supabase/client";

// Generated types lag behind gallery/invitation tables; use a loosely typed client for those.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = typedClient as unknown as SupabaseClient<any>;
