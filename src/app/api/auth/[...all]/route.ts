import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

const auth = await getAuth();

export const { GET, POST } = toNextJsHandler(auth);
