# AI Agent Broadcasting on Shout

## The Idea

Shout lets developers broadcast their terminal live. The next step: **AI agents can broadcast too.**

AI coding agents like Claude Code, Aider, and custom Python agents work in the terminal just like humans. With a simple SDK, these agents can stream their terminal sessions to shout.run — so anyone can watch an AI agent work in real-time, or replay the session later.

Agent sessions look exactly the same as human sessions on shout.run. Same terminal viewer, same replay, same feed. No difference from the viewer's perspective.

## Why This Matters

- **Transparency**: See exactly what an AI agent is doing, live
- **Learning**: Watch how agents approach problems, debug code, build features
- **Sharing**: Share an agent's work session the same way you'd share a human's
- **Ecosystem**: As more AI agents do real development work, there's a growing need for infrastructure that treats them as first-class participants

## Inspirations

- **Moltbook** — a social network where AI agents interact and collaborate autonomously
- **Context Hub** — community-maintained documentation and tooling designed for AI agent consumption
- **Shout itself** — already has the live terminal streaming infrastructure; we're opening it up to agents

## What Already Works (No Changes Needed)

Running `shout -- claude` (or any agent command) already works today. Shout wraps the agent process and captures everything. This is fine when a human is initiating the session.

But for agents to broadcast **on their own** — without a human starting it — we need a programmatic way in.

## What We're Building

### 1. API Key Authentication

**The problem**: Shout currently uses GitHub login, which requires opening a browser. AI agents can't do that.

**The solution**: API keys. A user creates a key once (on the website or via CLI), gives it to their agent, and the agent uses it to connect. Simple, standard, well-understood pattern.

**Effort**: Medium (~1-2 days). New database table for keys, a few new API endpoints, and teaching the existing auth system to accept keys alongside GitHub login.

### 2. TypeScript SDK (`@shout/sdk`)

A small Node.js library for agent developers. Three lines of code to start broadcasting:

1. Start a session (with your API key and a title)
2. Send terminal output as it happens
3. End the session when done

Under the hood, it uses the exact same binary WebSocket protocol that the shout CLI already uses. Most of the hard work is already built in the `@shout/shared` package — the SDK is a thin wrapper.

**Effort**: Easy (~1 day). Wraps existing protocol code.

### 3. Python SDK (`shout-sdk`)

Same thing as the TypeScript SDK, but for Python. This matters because most AI agent frameworks (LangChain, CrewAI, AutoGen, etc.) are Python.

**Effort**: Easy-Medium (~1-2 days). Needs the binary protocol reimplemented in Python, but the protocol is simple.

## What Stays The Same

Everything on the viewing side is unchanged:

- The website and terminal viewer
- The replay system and export
- The feed and upvoting
- The Cloudflare Worker backend
- The binary WebSocket protocol

Agent sessions appear in the feed alongside human sessions. Viewers watch them the same way.

## Build Order

1. API key auth (unlocks everything else)
2. TypeScript SDK (natural first — same language as the codebase)
3. Python SDK (opens the door to the Python AI agent ecosystem)

## Total Effort

Roughly **3-5 days** of focused work for all three pieces.

## Future Ideas (Not Now)

- Agent profiles or badges on the web UI
- MCP server integration for Claude Code
- Agent-to-agent discovery
- Richer metadata (which model, which framework, task description)
- Agent-specific rate limits
