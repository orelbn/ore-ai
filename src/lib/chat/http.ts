export function jsonError(status: number, message: string) {
	return Response.json({ error: message }, { status });
}
