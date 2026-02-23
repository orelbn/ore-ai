# Current Phase: Design and Architecture

# Ore AI

Ore AI is an agentic AI project built by Orel Ben Neriah (me), for my own learning and personal use. That said, if you want to copy it as a starting point for your own thing, go for it. This project will change fast and often. The plan is to host it under a subdomain on my personal website once there is something worth hosting.

The main goal is to have fun. Some of the tools I build into this agent will be more novelty than utility, and I am fine with that. Practical is great but interesting beats practical for me on a project like this. I am also planning to build a separate MCP server repo to experiment with that side of things. If anyone wants to collaborate or has a cool idea to contribute, I am open to it. Same goes for feedback or criticism if you stumble across this and have thoughts.

The structure of this project is a little unconventional. I am going to try to minimize how much code I write directly and instead rely on agents to do most of the actual coding. That does not mean I am just going to prompt something and use whatever comes out. I will be closely involved in the design, the prompting, and the code review. I want to understand what is being built and make sure it actually meets my standards. This is my first real attempt at this kind of workflow so expect some rough edges.

I am going to iterate fast and break things. The app may be down or incomplete at any given moment. Budget is tight right now, which will force some creative decisions about what I can actually run and how. If you work on a product and want to work out some kind of arrangement or let me use it as part of this project, reach out. I would genuinely appreciate it.

## Getting Started

### Prerequisites

- Bun
- Cloudflare account authenticated with Wrangler

### Install

```bash
bun install
```

### Run locally

```bash
bun dev
```

Open `http://localhost:3000` and verify the page shows: `Hello Ore AI`.

### Quality checks

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

### Cloudflare adapter preview

```bash
bun run preview
```

### Deploy

```bash
# Default environment
bun run deploy

# Dev environment
bun run deploy:dev
```

### Wrangler utilities

```bash
bun run cf:typegen
```

