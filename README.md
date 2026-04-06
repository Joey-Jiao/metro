# Metro

A tree-structured LLM chat interface for non-linear thinking and learning.

## Why

Most LLM chat interfaces are linear — send a message, get a response, keep scrolling. This works for simple questions, but complex learning naturally branches. An unfamiliar term leads to a side question, which leads to another, and before long the original thread is buried.

Metro treats conversations as trees instead of threads, allowing exploration of sub-questions while preserving the main line of inquiry.

- Branch from any message to explore a sub-question
- See the entire exploration as a visual graph on a canvas
- Collapse branches into summaries to reduce clutter
- Return to the main thread without losing place
- Organize related explorations into projects

## Design

Metro is a personal knowledge exploration tool.

**Trees, not graphs.** Branches are for bounded sub-questions — explore, understand, then return to the main thread. There is no "merge" operation, since merging conversation branches tends to create more confusion than clarity. Synthesis happens naturally on the main thread.

**Canvas as primary view.** The graph is the main interface, not a sidebar or minimap. It provides an overview of the exploration at a glance — where it went deep, where it branched, where it got stuck.

**Summaries over scrolling.** Each node shows a short summary by default, expandable on click. This makes navigating long explorations easier without endless scrolling.

**Local-first, bring your own key.** All data stays local. Users provide their own API key. No accounts, no sync, no telemetry.

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
