import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const promptsDir = path.join(rootDir, ".prompts");

function parseArgs(argv: string[]): { bucket: string } {
	let bucket: string | undefined;

	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index];
		if (token === "--bucket" || token === "-b") {
			bucket = argv[index + 1]?.trim();
			index += 1;
			continue;
		}
		throw new Error(`Unknown argument: ${token}`);
	}

	if (!bucket) {
		throw new Error("Missing required --bucket <bucket-name>.");
	}

	return { bucket };
}

function listPromptFiles(dirPath: string): string[] {
	const entries = readdirSync(dirPath, { withFileTypes: true });
	const files: string[] = [];

	for (const entry of entries) {
		const fullPath = path.join(dirPath, entry.name);
		if (entry.isDirectory()) {
			files.push(...listPromptFiles(fullPath));
			continue;
		}
		if (entry.isFile() && fullPath.toLowerCase().endsWith(".md")) {
			files.push(fullPath);
		}
	}

	return files;
}

function uploadPromptFile(bucket: string, filePath: string) {
	const relativePromptPath = path
		.relative(promptsDir, filePath)
		.replaceAll("\\", "/");
	const objectKey = `prompts/${relativePromptPath}`;
	const targetObject = `${bucket}/${objectKey}`;

	console.log(
		`[prompt-upload] Uploading ${path.relative(rootDir, filePath)} to ${targetObject}`,
	);

	execFileSync(
		"bunx",
		[
			"wrangler",
			"r2",
			"object",
			"put",
			targetObject,
			"--file",
			filePath,
			"--remote",
		],
		{
			stdio: "inherit",
		},
	);
}

function main() {
	const args = parseArgs(process.argv.slice(2));

	if (!existsSync(promptsDir)) {
		throw new Error("Prompts directory does not exist: .prompts");
	}

	const promptFiles = listPromptFiles(promptsDir);
	if (promptFiles.length === 0) {
		throw new Error("No markdown prompt files found in .prompts");
	}

	for (const filePath of promptFiles) {
		uploadPromptFile(args.bucket, filePath);
	}

	console.log(
		`[prompt-upload] Upload complete. Uploaded ${promptFiles.length} prompt file(s).`,
	);
}

try {
	main();
} catch (error) {
	const message = error instanceof Error ? error.message : "unknown error";
	console.error(`[prompt-upload] ${message}`);
	process.exit(1);
}
