/**
 * Application-wide TypeScript types shared between web, mobile, and edge functions.
 *
 * Domain-specific financial types live in @cornerstone/core.
 * Database row types live in @cornerstone/db (auto-generated from Drizzle).
 */

export type SubscriptionPlan = "free" | "personal" | "family_s" | "family_m";

export type SubscriptionStatus = "active" | "canceled" | "past_due" | "trialing" | "unpaid";

export type HouseholdRole = "owner" | "member";

export type Locale =
  | "es" // Español
  | "en" // English
  | "pt" // Português
  | "fr" // Français
  | "de" // Deutsch
  | "it" // Italiano
  | "pl" // Polski
  | "ru" // Русский
  | "ja" // 日本語
  | "zh" // 中文
  | "ko"; // 한국어

export const SUPPORTED_LOCALES: Locale[] = ["es", "en", "pt", "fr", "de", "it", "pl", "ru", "ja", "zh", "ko"];

export const PLAN_LIMITS: Record<SubscriptionPlan, {
  maxMembers: number;
  whatsappEnabled: boolean;
  aiAdvisorMonthlyLimit: number; // -1 = unlimited
  investmentsEnabled: boolean;
  monthlyTransactionLimit: number; // -1 = unlimited
}> = {
  free: {
    maxMembers: 1,
    whatsappEnabled: false,
    aiAdvisorMonthlyLimit: 5,
    investmentsEnabled: false,
    monthlyTransactionLimit: 50,
  },
  personal: {
    maxMembers: 1,
    whatsappEnabled: true,
    aiAdvisorMonthlyLimit: -1,
    investmentsEnabled: true,
    monthlyTransactionLimit: -1,
  },
  family_s: {
    maxMembers: 2,
    whatsappEnabled: true,
    aiAdvisorMonthlyLimit: -1,
    investmentsEnabled: true,
    monthlyTransactionLimit: -1,
  },
  family_m: {
    maxMembers: 3,
    whatsappEnabled: true,
    aiAdvisorMonthlyLimit: -1,
    investmentsEnabled: true,
    monthlyTransactionLimit: -1,
  },
};

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };
