import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const promptsDir = path.join(rootDir, ".prompts");

interface UploadArgs {
	bucket: string;
	sourcePath?: string;
}

function parseArgs(argv: string[]): UploadArgs {
	let bucket: string | undefined;
	let sourcePath: string | undefined;

	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index];
		if (token === "--bucket" || token === "-b") {
			bucket = argv[index + 1]?.trim();
			index += 1;
			continue;
		}
		if (token === "--source" || token === "-s") {
			sourcePath = argv[index + 1]?.trim();
			index += 1;
			continue;
		}
		throw new Error(`Unknown argument: ${token}`);
	}

	if (!bucket) {
		throw new Error("Missing required --bucket <bucket-name>.");
	}

	return { bucket, sourcePath };
}

function listPromptFiles(dirPath: string): string[] {
	const entries = readdirSync(dirPath, { withFileTypes: true });
	const files: string[] = [];

	for (const entry of entries) {
		const fullPath = path.join(dirPath, entry.name);
		if (entry.isFile() && fullPath.toLowerCase().endsWith(".md")) {
			files.push(fullPath);
		}
	}

	return files;
}

function listMarkdownFilesRecursive(dirPath: string): string[] {
	const entries = readdirSync(dirPath, { withFileTypes: true });
	const files: string[] = [];

	for (const entry of entries) {
		const fullPath = path.join(dirPath, entry.name);
		if (entry.isDirectory()) {
			files.push(...listMarkdownFilesRecursive(fullPath));
			continue;
		}
		if (entry.isFile() && fullPath.toLowerCase().endsWith(".md")) {
			files.push(fullPath);
		}
	}

	return files;
}

function resolveUploadTargets(args: UploadArgs): {
	baseDir: string;
	files: string[];
} {
	if (!args.sourcePath) {
		return {
			baseDir: promptsDir,
			files: listPromptFiles(promptsDir),
		};
	}

	const resolvedSource = path.resolve(rootDir, args.sourcePath);
	if (!existsSync(resolvedSource)) {
		throw new Error(`Source does not exist: ${args.sourcePath}`);
	}

	const stats = statSync(resolvedSource);
	if (stats.isFile()) {
		if (!resolvedSource.toLowerCase().endsWith(".md")) {
			throw new Error("Source file must be a markdown file (.md).");
		}
		return {
			baseDir: path.dirname(resolvedSource),
			files: [resolvedSource],
		};
	}

	if (stats.isDirectory()) {
		return {
			baseDir: resolvedSource,
			files: listMarkdownFilesRecursive(resolvedSource),
		};
	}

	throw new Error(`Unsupported source type: ${args.sourcePath}`);
}

function uploadPromptFile(bucket: string, filePath: string, baseDir: string) {
	const relativePromptPath = path
		.relative(baseDir, filePath)
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

	if (!args.sourcePath && !existsSync(promptsDir)) {
		throw new Error("Prompts directory does not exist: .prompts");
	}

	const targets = resolveUploadTargets(args);
	const promptFiles = targets.files;
	if (promptFiles.length === 0) {
		if (args.sourcePath) {
			throw new Error(
				`No markdown prompt files found in source: ${args.sourcePath}`,
			);
		}
		throw new Error("No markdown prompt files found in .prompts");
	}

	for (const filePath of promptFiles) {
		uploadPromptFile(args.bucket, filePath, targets.baseDir);
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
