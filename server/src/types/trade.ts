/** Possible states a trade offer moves through */
export type TradeStatus = "Active" | "Locked" | "Completed" | "Cancelled";

/** Shape of a row returned from the trade_offers table */
export interface TradeOffer {
  id: string;
  seller_id: string;
  asset_type: string;
  amount: number;
  status: TradeStatus;
  contract_listing_id: string | null;
  expires_at: string; // ISO timestamp
  created_at: string;
  updated_at: string;
}
