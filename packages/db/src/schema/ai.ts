import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

/**
 * Saved chat conversations between user and the AI financial advisor.
 * Messages stored as JSONB array: [{role, content, createdAt, tokensUsed}].
 */
export const aiConversations = pgTable(
  "ai_conversations",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title"), // auto-generated summary
    messages: jsonb("messages").notNull().default(sql`'[]'::jsonb`),
    inputTokensTotal: integer("input_tokens_total").notNull().default(0),
    outputTokensTotal: integer("output_tokens_total").notNull().default(0),
    cachedTokensTotal: integer("cached_tokens_total").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => ({
    userIdx: index("idx_ai_conv_user").on(t.userId),
  })
);

/**
 * WhatsApp bot session state — short-lived, used for multi-turn flows
 * (e.g., "you mean food, right?" follow-ups).
 */
export const whatsappSessions = pgTable("whatsapp_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  whatsappNumber: text("whatsapp_number").notNull(),
  state: jsonb("state").notNull().default(sql`'{}'::jsonb`),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().default(sql`now()`),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
