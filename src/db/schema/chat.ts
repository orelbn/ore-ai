import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./auth";

export const chatSessions = sqliteTable(
	"chat_sessions",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		lastMessagePreview: text("last_message_preview").default("").notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		lastMessageAt: integer("last_message_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		index("chat_sessions_user_last_message_idx").on(
			table.userId,
			table.lastMessageAt,
		),
	],
);

export const chatMessages = sqliteTable(
	"chat_messages",
	{
		id: text("id").primaryKey(),
		sessionId: text("session_id")
			.notNull()
			.references(() => chatSessions.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
		partsJson: text("parts_json").notNull(),
		textPreview: text("text_preview").default("").notNull(),
		ipHash: text("ip_hash"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		index("chat_messages_session_created_idx").on(
			table.sessionId,
			table.createdAt,
		),
		index("chat_messages_user_created_idx").on(table.userId, table.createdAt),
		index("chat_messages_ip_created_idx").on(table.ipHash, table.createdAt),
	],
);

export const chatSessionsRelations = relations(
	chatSessions,
	({ many, one }) => ({
		messages: many(chatMessages),
		user: one(users, {
			fields: [chatSessions.userId],
			references: [users.id],
		}),
	}),
);

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
	session: one(chatSessions, {
		fields: [chatMessages.sessionId],
		references: [chatSessions.id],
	}),
	user: one(users, {
		fields: [chatMessages.userId],
		references: [users.id],
	}),
}));
