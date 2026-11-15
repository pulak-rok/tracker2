export type RoadmapStatus = "active" | "archived" | "completed";
export type TradeOutcome = "WIN" | "LOSS" | "BE";
export type TradingSession = "London" | "New York" | "Asian" | "Other";
export type RecordEntryMode = "summary" | "detailed";

export interface Profile {
  id: string;
  display_name: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Roadmap {
  id: string;
  user_id: string;
  name: string;
  profit_target: number;
  starting_balance: number;
  risk_per_trade: number;
  rr_ratio: number;
  win_rate_assumption: number | null;
  start_date: string;
  target_date: string;
  max_drawdown: number | null;
  daily_trade_limit: number | null;
  notes: string | null;
  status: RoadmapStatus;
  created_at: string;
  updated_at: string;
}

export interface DailyRecord {
  id: string;
  user_id: string;
  roadmap_id: string;
  trade_date: string;
  entry_mode: RecordEntryMode;
  session: TradingSession | null;
  total_trades: number;
  wins: number;
  losses: number;
  break_evens: number;
  gross_profit: number;
  gross_loss: number;
  net_pl: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  trades?: Trade[];
}

export interface Trade {
  id: string;
  user_id: string;
  roadmap_id: string;
  daily_record_id: string;
  trade_no: number;
  symbol: string;
  session: TradingSession | null;
  outcome: TradeOutcome;
  risk_amount: number;
  rr_achieved: number | null;
  pnl: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  roadmaps?: { name: string };
}
