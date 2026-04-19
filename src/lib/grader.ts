import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const client = new Anthropic();

export const GradeOutput = z.object({
  score: z
    .number()
    .describe("Integer 0-10. 0 = completely fails the task, 10 = exemplary."),
  pass: z.boolean().describe("Whether the submission meets the bar for approval."),
  reasoning: z
    .string()
    .describe("2-4 sentences justifying the score. Cite specific aspects of the submission."),
  strengths: z.array(z.string()).describe("Concrete things the submission did well."),
  weaknesses: z.array(z.string()).describe("Concrete gaps, errors, or omissions."),
  confidence: z
    .enum(["low", "medium", "high"])
    .describe("How confident you are in this grade given the inputs available."),
});

export type GradeResult = z.infer<typeof GradeOutput>;

const RUBRIC = `You are an impartial grader for Taskmarket, an agentic bounty platform.
You receive a TASK DESCRIPTION written by a requester and a SUBMISSION produced by a worker agent.
Your job: return a strict, honest evaluation.

GRADING CRITERIA (apply in order):
1. Correctness — does the submission do what the task asks? Partial credit only if the core outcome is present.
2. Completeness — are all explicit deliverables included? Missing deliverables cap the score at 5.
3. Quality — is the work careful, well-formatted, and free of obvious errors?
4. Originality — is this real work, or a thin rephrasing / refusal / meta-description of what the submitter "would" do?
5. Hallucination check — does the submission invent facts, fake URLs, fabricated transaction hashes, or made-up citations? Any hallucination caps the score at 3.

SCORING ANCHORS:
- 9-10: Complete, correct, well-crafted. A requester would happily approve and tip.
- 7-8: Solid work with minor issues.
- 5-6: Meets the minimum ask but has real gaps.
- 3-4: Attempts the task but misses major requirements.
- 1-2: Refusal, meta-description, or barely-related content.
- 0: Empty, spam, or adversarial.

PASS THRESHOLD: pass = (score >= 7). Not negotiable.

REFUSAL DETECTION:
Submissions that say "I cannot complete this autonomously", "browser interaction required",
"I do not have access to X", or otherwise describe what they would do instead of doing it
must be scored 1-2 with pass=false, regardless of how well-written the refusal is.

OUTPUT:
Return valid JSON matching the provided schema. Be concise in reasoning — 2-4 sentences.
Do not flatter. Do not hedge. Grade the work in front of you.`;

export async function gradeSubmission(input: {
  task_description: string;
  submission: string;
}): Promise<GradeResult> {
  const userPrompt = `TASK DESCRIPTION:
${input.task_description}

---
SUBMISSION:
${input.submission}

---
Grade this submission now.`;

  const response = await client.messages.parse({
    model: "claude-opus-4-7",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: zodOutputFormat(GradeOutput),
    },
    cache_control: { type: "ephemeral" },
    system: [
      {
        type: "text",
        text: RUBRIC,
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  if (!response.parsed_output) {
    throw new Error(
      `Grader returned no parsed_output. stop_reason=${response.stop_reason}`,
    );
  }

  return response.parsed_output;
}
