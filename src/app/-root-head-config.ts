export const rootMeta = [
	{ charSet: "utf-8" },
	{
		name: "viewport",
		content: "width=device-width, initial-scale=1",
	},
	{
		title: "Ore AI",
	},
	{
		name: "description",
		content: "Hello Ore AI",
	},
];

export function getRootLinks(appStylesheetHref: string) {
	return [
		{
			rel: "stylesheet",
			href: appStylesheetHref,
		},
		{
			rel: "icon",
			href: "/favicon.ico",
		},
	];
}

export const rootScripts = [{ src: "/theme-init.js" }];
