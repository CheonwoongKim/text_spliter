import type { getAppSupabase } from "@/lib/supabase-server";

/**
 * Everything an evaluation action handler needs, resolved once by the route.
 *
 * A handler returns `null` when the action is not its own, which lets the route
 * try each domain in turn without duplicating the dispatch table.
 */
export interface EvaluationActionContext {
  user: { id: string; email?: string | null };
  body: Record<string, unknown>;
  action: string;
  supabase: ReturnType<typeof getAppSupabase>;
}
