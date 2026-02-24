import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./db/schema/auth.ts",
	out: "./migrations",
	dialect: "sqlite",
});
