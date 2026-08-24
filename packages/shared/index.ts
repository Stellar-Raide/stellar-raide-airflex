export enum TradeStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export interface User {
  id: string;
  stellarPublicKey: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TradeOffer {
  id: string;
  sellerId: string;
  buyerId?: string;
  assetCode: string;
  assetIssuer?: string;
  amount: number;
  price: number;
  currency: string;
  status: TradeStatus;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}
