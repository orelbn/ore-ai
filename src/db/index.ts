import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as authSchema from "./schema/auth";
import * as chatSchema from "./schema/chat";

const schema = {
	...authSchema,
	...chatSchema,
};

export async function getDb() {
	return drizzle(env.DB, { schema });
}
