import { Evaluator, EvaluatorError } from "./Evaluator";
import { Problem } from "../domain/Problem";
import { Submission } from "../domain/Submission";
import { CriterionScore } from "../domain/types";

const CRITERIA = [
  "Responsibility Assignment",
  "Abstraction Level",
  "Relationships & Coupling",
  "Extensibility",
  "Trade-off Reasoning",
];

const DEFAULT_TIMEOUT_MS = 20_000;
const GROQ_MODEL = "llama-3.1-8b-instant";

/**
 * Judges the things that genuinely need reasoning and where there's no single
 * right answer: is responsibility assignment sensible, is the abstraction
 * level appropriate, are relationships/coupling reasonable, would the design
 * extend cleanly, and did the learner reason about trade-offs at all.
 *
 * Runs asynchronously and enforces a hard timeout (kept deliberately simple —
 * no retry queue or backoff, per the assignment's scope guidance). On
 * failure/timeout it throws an EvaluatorError; the caller (EvaluationService)
 * decides how to degrade gracefully.
 *
 * If GROQ_API_KEY is not set, falls back to a clearly-labeled mock so the
 * whole practice loop is runnable and demoable without any credentials.
 */
export class LLMDesignEvaluator implements Evaluator {
  readonly name = "LLMDesignEvaluator";

  constructor(private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS) {}

  supports(submission: Submission): boolean {
    return submission.format === "TEXT_DESIGN" || submission.format === "CODE";
  }

  async evaluate(submission: Submission, problem: Problem): Promise<CriterionScore[]> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return this.mockEvaluate(submission, problem);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          max_tokens: 1200,
          temperature: 0,
          messages: [
            { role: "system", content: this.buildSystemPrompt() },
            { role: "user", content: this.buildUserPrompt(submission, problem) },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new EvaluatorError(this.name, `API returned ${response.status}: ${text}`);
      }

      const data: any = await response.json();
      const text = data.choices?.[0]?.message?.content || "";

      return this.parseModelOutput(text);
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new EvaluatorError(this.name, `Timed out after ${this.timeoutMs}ms`);
      }
      if (err instanceof EvaluatorError) throw err;
      throw new EvaluatorError(this.name, err.message || "Unknown LLM evaluation error");
    } finally {
      clearTimeout(timer);
    }
  }

  private buildSystemPrompt(): string {
    return [
      "You are an experienced software engineer reviewing a learner's Low-Level Design solution.",
      "There can be more than one valid design. Judge whether THIS design is internally consistent,",
      "well-reasoned, and appropriate for the stated requirements — not whether it matches one 'ideal' answer.",
      "",
      `Score exactly these criteria, each 0-10: ${CRITERIA.join(", ")}.`,
      "",
      "Respond with ONLY a JSON object, no markdown fences, no preamble, matching this shape:",
      `{"criteria": [{"criterion": "string", "score": 0, "comment": "specific, actionable, references their submission"}], "narrative": "2-4 sentences, specific to what they actually wrote"}`,
    ].join("\n");
  }

  private buildUserPrompt(submission: Submission, problem: Problem): string {
    return [
      `Problem: ${problem.title}`,
      `Description: ${problem.description}`,
      `Requirements:\n- ${problem.requirements.join("\n- ")}`,
      `Constraints:\n- ${problem.constraints.join("\n- ")}`,
      "",
      "Learner's submission:",
      "---",
      submission.content,
      "---",
    ].join("\n");
  }

  private parseModelOutput(text: string): CriterionScore[] {
    const cleaned = text.replace(/```json|```/g, "").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new EvaluatorError(this.name, "Model did not return valid JSON.");
    }
    const criteria = Array.isArray(parsed.criteria) ? parsed.criteria : [];
    if (criteria.length === 0) {
      throw new EvaluatorError(this.name, "Model returned no criteria scores.");
    }
    const scores: CriterionScore[] = criteria.map((c: any) => ({
      criterion: String(c.criterion),
      score: Math.max(0, Math.min(10, Number(c.score) || 0)),
      comment: String(c.comment || ""),
    }));
    if (parsed.narrative) {
      scores.push({
        criterion: "Overall Narrative",
        score: Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length),
        comment: String(parsed.narrative),
      });
    }
    return scores;
  }

  /** Runnable without an API key, clearly labeled as a placeholder. */
  private async mockEvaluate(submission: Submission, problem: Problem): Promise<CriterionScore[]> {
    await new Promise((r) => setTimeout(r, 400));
    const lengthSignal = Math.min(10, Math.round(submission.content.length / 120));
    return [
      ...CRITERIA.map((criterion) => ({
        criterion,
        score: Math.max(3, lengthSignal),
        comment:
          "[MOCK — set GROQ_API_KEY to enable real LLM review] Placeholder score based on submission length only.",
      })),
      {
        criterion: "Overall Narrative",
        score: Math.max(3, lengthSignal),
        comment: `[MOCK] No GROQ_API_KEY configured, so this is a placeholder review for "${problem.title}". Add a real key to get genuine design feedback.`,
      },
    ];
  }
}
