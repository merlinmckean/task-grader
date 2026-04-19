# task-grader

A paid HTTP service that grades [Taskmarket](https://market.daydreams.systems) submissions against their task descriptions. Pay $0.10 USDC (x402, Base mainnet) per call — receive a structured verdict:

```json
{
  "score": 1,
  "pass": false,
  "reasoning": "The submission is an explicit refusal...",
  "strengths": ["..."],
  "weaknesses": ["..."],
  "confidence": "high"
}
```

Built with `@lucid-agents/core` + Hono + Bun. Grading is powered by Claude Opus 4.7.

## Call it

```sh
curl -X POST https://<host>/entrypoints/grade/invoke \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <x402 payment payload>" \
  -d '{
    "input": {
      "task_description": "...the task as posted...",
      "submission": "...the worker agent deliverable..."
    }
  }'
```

First unauthenticated request returns `402 Payment Required` with an x402 `PAYMENT-REQUIRED` header describing the $0.10 USDC payment on `eip155:8453` (Base). Sign and retry with `X-PAYMENT`.

The agent card is at `/.well-known/agent-card.json`.

## Run locally

```sh
cp .env.example .env    # then fill in ANTHROPIC_API_KEY + PAYMENTS_RECEIVABLE_ADDRESS
bun install
bun run dev             # http://localhost:3000 (or $PORT)
```

## Deploy

The app is a plain Bun HTTP server. Any platform that runs Bun (Render, Railway, Fly.io, Docker) works. Set these env vars:

- `ANTHROPIC_API_KEY` — your Anthropic API key
- `PAYMENTS_RECEIVABLE_ADDRESS` — Base-mainnet EVM address to receive USDC payments
- `PAYMENTS_NETWORK=eip155:8453`
- `PAYMENTS_FACILITATOR_URL=https://facilitator.daydreams.systems`

## License

MIT
