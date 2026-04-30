export type Role = "USER" | "ADMIN";
export type PaymentStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Campaign {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface ExchangeRate {
  id: string;
  campaignId: string;
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  effectiveDate: string;
}

export interface Payment {
  id: string;
  userId: string;
  campaignId: string;
  amount: string;
  currency: string;
  exchangeRate: string | null;
  localAmount: string | null;
  localCurrency: string | null;
  reference: string;
  bankName: string;
  paymentDate: string;
  imageUrl: string;
  status: PaymentStatus;
  notes: string | null;
  adminNotes: string | null;
  receiptToken: string | null;
  validatedAt: string | null;
  createdAt: string;
  user?: UserSummary;
  campaign?: Campaign;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}
