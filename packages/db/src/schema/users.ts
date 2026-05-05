import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  varchar,
  integer,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { subscriptionPlanEnum, householdRoleEnum, invitationChannelEnum, invitationStatusEnum, localeEnum } from "./enums";

/**
 * Users — mirrors auth.users from Supabase.
 * `id` matches Supabase Auth user ID.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  baseCurrency: varchar("base_currency", { length: 3 }).notNull().default("USD"),
  locale: localeEnum("locale").notNull().default("en"),
  whatsappNumber: text("whatsapp_number").unique(), // E.164 format
  whatsappCountryCode: varchar("whatsapp_country_code", { length: 2 }), // ISO 3166-1 alpha-2
  stripeCustomerId: text("stripe_customer_id").unique(),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  timezone: text("timezone").notNull().default("UTC"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

/**
 * Household — a "family group" of up to N users sharing financial data.
 * Every authenticated user belongs to exactly one household (their own, if solo).
 */
export const households = pgTable("households", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().default("Personal"),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subscriptionPlan: subscriptionPlanEnum("subscription_plan").notNull().default("free"),
  maxMembers: integer("max_members").notNull().default(1),
  baseCurrency: varchar("base_currency", { length: 3 }).notNull().default("USD"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

/**
 * Junction table: which users belong to which household.
 */
export const householdMembers = pgTable("household_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: householdRoleEnum("role").notNull().default("member"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().default(sql`now()`),
});

/**
 * Pending invitations to join a household (sent via email or WhatsApp).
 */
export const householdInvitations = pgTable("household_invitations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  invitedByUserId: uuid("invited_by_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  channel: invitationChannelEnum("channel").notNull(),
  invitedEmail: text("invited_email"),
  invitedWhatsapp: text("invited_whatsapp"), // E.164
  token: text("token").notNull().unique(),
  status: invitationStatusEnum("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});
