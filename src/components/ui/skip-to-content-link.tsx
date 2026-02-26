import { cn } from "@/lib/utils";

type SkipToContentLinkProps = {
	href?: string;
	children?: string;
	className?: string;
};

const baseClassName = cn(
	"sr-only",
	"focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50",
	"focus:rounded-md focus:bg-background focus:px-3 focus:py-2",
	"focus:text-sm focus:font-medium focus:text-foreground",
	"focus:shadow-md focus:ring-2 focus:ring-primary",
);

export function SkipToContentLink({
	href = "#main-content",
	children = "Skip to main content",
	className,
}: SkipToContentLinkProps) {
	return <a href={href} className={cn(baseClassName, className)}>{children}</a>;
}
