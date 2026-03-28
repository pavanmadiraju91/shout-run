import { GoogleGenerativeAI } from '@google/generative-ai';
import { green, red, bold, cyan, dim, banner } from './lib.mjs';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error(red('Missing GEMINI_API_KEY environment variable.'));
  console.error();
  console.error('Get a free API key at: https://aistudio.google.com/apikey');
  console.error('Then run:');
  console.error();
  console.error(`  ${cyan('export GEMINI_API_KEY=your_key_here')}`);
  console.error(`  ${cyan('node agent-build.mjs')}`);
  process.exit(1);
}

const SYSTEM_INSTRUCTION = `You are a coding agent working in a terminal. Build a small Node.js project step by step.

Rules:
- Show each file you create with its full contents in markdown code blocks
- Before each file, briefly explain what it does (1-2 sentences)
- After creating all files, show how to run the project
- Be concise — this is a live demo, keep it moving
- Format your output for a terminal — use markdown code blocks with the filename as the language label
- Do NOT use any horizontal rules or decorative separators`;

const USER_PROMPT = `Build a simple URL shortener CLI tool in Node.js. It should:
- Generate short codes for URLs and store them in a local JSON file
- Look up a short code and print the original URL
- List all stored URLs
- Have a clean CLI interface with help text

Create the files one at a time. Show the complete contents of each file.`;

async function main() {
  banner('shout demo — AI agent build');
  console.log(dim('Model: gemini-2.0-flash'));
  console.log(dim('Task:  Build a URL shortener CLI'));
  console.log();
  console.log(green(bold('Agent is building a URL shortener CLI...')));
  console.log();

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SYSTEM_INSTRUCTION,
  });

  const result = await model.generateContentStream(USER_PROMPT);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      process.stdout.write(text);
    }
  }

  console.log();
  console.log();
  console.log(green(bold('Done. Agent finished building the project.')));
}

main().catch((err) => {
  console.error();
  console.error(red(`Error: ${err.message}`));
  process.exit(1);
});
