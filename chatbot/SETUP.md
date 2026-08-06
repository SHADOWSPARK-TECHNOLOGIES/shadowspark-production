# ShadowSpark Chatbot — Install Guide

A floating chat bubble that explains ShadowSpark's services, powered by Claude Haiku 4.5.
Runs entirely on Vercel as a serverless function — no GCP, no extra service, no extra billing.

## What's included
1. `route.ts` — the API endpoint that talks to Claude (with your ShadowSpark knowledge baked in)
2. `ChatWidget.tsx` — the floating chat bubble UI (dark theme, orange accent to match your site)

## Install (3 steps)

### 1. Drop the files into your Next.js project (`~/shadowspark-clean`)

```bash
# API route
mkdir -p app/api/chat
cp route.ts app/api/chat/route.ts

# Component
mkdir -p components
cp ChatWidget.tsx components/ChatWidget.tsx
```

### 2. Mount the widget in your root layout

In `app/layout.tsx`, import and render it once (it floats over everything):

```tsx
import ChatWidget from "@/components/ChatWidget";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
```

### 3. Add your Anthropic API key to Vercel

```bash
vercel env add ANTHROPIC_API_KEY production
vercel env add ANTHROPIC_API_KEY preview
# paste your sk-ant-... key when prompted (it won't show in terminal history)
```

Get a key at: https://console.anthropic.com/settings/keys

## Deploy

```bash
vercel --prod
```

## Test locally first (optional)

```bash
# pull the env var down locally
vercel env pull .env.local
pnpm dev
# open http://localhost:3000 — the bubble appears bottom-right
```

## Cost

Claude Haiku 4.5 is $1 per million input tokens, $5 per million output tokens.
A typical site chat (a few short turns) costs a fraction of a cent.
The API route trims history to the last 10 messages to keep costs predictable.

## Customizing what the bot knows

Edit the `SYSTEM_PROMPT` string at the top of `route.ts`. That's the bot's entire
knowledge — update services, add FAQs, change tone, etc. Redeploy after editing.

## Notes
- The widget uses inline styles so it works without Tailwind config — but you can
  swap to your own classes if you prefer.
- `runtime = "edge"` gives fast cold starts. Remove that line to use the Node runtime
  if you later need Node-only APIs.
- No data is stored — conversations live only in the browser session.
