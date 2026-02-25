import { getAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const authHandler = async (request: Request) => {
	const auth = await getAuth();
	return auth.handler(request);
};

export const { GET, POST } = toNextJsHandler(authHandler);
