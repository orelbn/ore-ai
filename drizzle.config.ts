import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "sqlite",
	schema: "./src/services/auth/schema.ts",
	out: "./migrations",
});
