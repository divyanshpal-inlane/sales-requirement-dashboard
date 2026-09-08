import type { PrepGameId } from "@/constants/prepGames";
import { supabase } from "@/lib/supabaseClient";

export async function recordGameLaunch(gameId: PrepGameId) {
  const { error } = await supabase.rpc("record_game_launch", {
    p_event_id: crypto.randomUUID(),
    p_game_id: gameId,
  });
  if (error) throw error;
}

export interface GameAnalyticsRow {
  learner_id: string;
  name: string | null;
  phone: string;
  game_id: PrepGameId;
  opens: number;
  first_opened_at: string | null;
  last_opened_at: string | null;
}

export interface GameAnalyticsReport {
  rows: GameAnalyticsRow[];
  total_rows: number;
  tracking_since: string;
}

export async function fetchGameAnalytics(
  search: string,
  game: string,
  activity: string,
  page: number,
): Promise<GameAnalyticsReport> {
  const { data, error } = await supabase.rpc("get_game_analytics", {
    p_search: search,
    p_game_id: game,
    p_activity: activity,
    p_page: page,
  });
  if (error) throw error;
  return data as unknown as GameAnalyticsReport;
}
