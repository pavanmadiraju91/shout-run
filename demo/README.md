# shout demos

AI agent demos powered by Google Gemini. Watch an AI agent build a project
live in your terminal — then broadcast it with shout for others to see.

## Prerequisites

- Node.js 20+
- A Google Gemini API key (free tier works) — get one at https://aistudio.google.com/apikey
- shout CLI installed (`npm i -g shout-run`) — only needed for broadcasting

## Step-by-step

### Step 1: Install demo dependencies

```sh
cd demo
npm install
```

This installs the Google Generative AI SDK. One-time setup.

### Step 2: Set your Gemini API key

```sh
export GEMINI_API_KEY=your_key_here
```

Replace `your_key_here` with your actual API key from Google AI Studio.

### Step 3: Run the demo locally

```sh
node agent-build.mjs
```

You'll see an AI agent build a small Node.js project step by step,
streaming its output in real time with colored terminal formatting.
Takes about 30–60 seconds.

### Step 4 (optional): Broadcast it live with shout

Make sure you're logged in first:

```sh
shout login
```

Then broadcast the demo:

```sh
node agent-build.mjs | shout -t "Agent building a project"
```

Share the URL that shout prints — anyone with the link can watch the
agent work in real time in their browser.

## What the demo does

The `agent-build.mjs` script:
1. Connects to the Gemini API (gemini-2.0-flash model)
2. Asks the AI to build a small project step by step
3. Streams the response to your terminal in real time
4. Formats output with ANSI colors (green for narration, code blocks, etc.)

The whole point is to show what it looks like when an AI agent broadcasts
its terminal work — the core use case for shout.
