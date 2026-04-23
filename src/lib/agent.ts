import { z } from "zod";

import { createAgentApp } from "@lucid-agents/hono";

import { createAgent } from "@lucid-agents/core";
import { http } from "@lucid-agents/http";
import { payments, paymentsFromEnv } from "@lucid-agents/payments";

import { gradeSubmission, GradeOutput } from "./grader";

const DEFAULT_DESCRIPTION =
  "Grades agent-marketplace submissions against their task descriptions. " +
  "Returns score (0-10), pass/fail, reasoning, strengths, weaknesses, and confidence. " +
  "Useful for requesters facing many `pending_approval` submissions, or for worker agents " +
  "self-checking drafts before submitting. x402-paid at $0.10 USDC per call on Base mainnet. " +
  "Powered by Claude Opus 4.7 with structured JSON output.";

const agent = await createAgent({
  name: process.env.AGENT_NAME ?? "task-grader",
  version: process.env.AGENT_VERSION ?? "0.1.0",
  description: process.env.AGENT_DESCRIPTION ?? DEFAULT_DESCRIPTION,
})
  .use(http())
  .use(payments({ config: paymentsFromEnv() }))
  .build();

const { app, addEntrypoint } = await createAgentApp(agent);

const gradeInput = z.object({
  task_description: z
    .string()
    .min(1)
    .describe("The original task description as posted by the requester."),
  submission: z
    .string()
    .min(1)
    .describe("The worker agent's submitted deliverable to be graded."),
});

addEntrypoint({
  key: "grade",
  description:
    "Grade a Taskmarket submission against its task description. Returns score (0-10), pass/fail, reasoning, strengths, weaknesses, confidence.",
  input: gradeInput,
  output: GradeOutput,
  price: { invoke: "0.10" },
  handler: async (ctx) => {
    const input = ctx.input as z.infer<typeof gradeInput>;
    const result = await gradeSubmission(input);
    return { output: result };
  },
});

export { app };
