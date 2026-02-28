# Metro

A tree-structured LLM chat interface for non-linear thinking and learning.

## The Problem

LLM chat interfaces are linear. You send a message, get a response, scroll down, repeat. But learning doesn't work that way.

When you're trying to understand something complex, you branch. You hit a term you don't understand, so you ask about it. That leads to another question. Eventually you want to go back to where you started, but now you've lost the thread, or you're managing five separate conversations that should be one.

## The Solution

Metro treats conversations as trees, not threads.

- Branch from any message to explore a sub-question
- See your entire exploration as a visual graph on a canvas
- Collapse branches into summaries to reduce clutter
- Return to your main line of inquiry without losing context
- Organize related explorations into projects

## Design Intentions

Metro is built for personal knowledge exploration, not enterprise deployment.

**Trees, not graphs.** Branches are for bounded sub-questions. You explore, you understand, you return to the main thread. There is no "merge" operation. This is intentional — merging conversation branches creates semantic confusion. If you need synthesis, do it yourself on the main branch.

**Canvas as primary view.** The graph isn't a sidebar or a minimap. It's the main interface. You should be able to see the shape of your thinking at a glance: where you went deep, where you branched, where you got stuck.

**Summaries over scrolling.** Each node shows a short summary by default. Click to expand. This lets you navigate a long exploration without endless scrolling.

**Local-first, bring your own key.** Your data stays on your machine. You provide your own API key. No accounts, no sync, no telemetry.

## Stack

- SolidJS + TypeScript
- D3 (tree layout + zoom)
- Tailwind CSS
- Dexie (IndexedDB)
- Vite

## Infra Series

Metro is part of a personal infrastructure project series:

| Project | Purpose |
|---------|---------|
| tectonic | Linux bootstrap |
| strata | MCP server |
| magma | Code templates |
| metro | Tree-structured LLM chat |

## License

MIT
