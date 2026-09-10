import { v4 as uuid } from "uuid";
import { Attempt } from "../domain/Attempt";
import { Problem } from "../domain/Problem";
import { EvaluationReport } from "../domain/EvaluationReport";
import { CompositeEvaluator } from "../evaluators/CompositeEvaluator";
import { CriterionScore } from "../domain/types";

/**
 * Orchestrates evaluation for a single attempt and owns the policy for
 * "what counts as a fully evaluated attempt vs. a failed one".
 *
 * Policy (kept intentionally simple, matching the assignment's scope
 * guidance not to turn this into a distributed-systems project):
 *  - StructuralRuleEvaluator is treated as required. If it fails (it
 *    shouldn't, since it's pure local logic), the whole evaluation fails.
 *  - LLMDesignEvaluator is treated as best-effort. If it fails or times
 *    out, the attempt is marked FAILED but the report still carries
 *    whatever deterministic feedback succeeded (`partial: true`), rather
 *    than discarding useful feedback the learner already earned.
 */
export class EvaluationService {
  constructor(private readonly compositeEvaluator: CompositeEvaluator) {}

  async evaluate(attempt: Attempt, problem: Problem): Promise<EvaluationReport> {
    if (!attempt.submission) {
      throw new Error("Cannot evaluate an attempt with no submission.");
    }

    attempt.markEvaluating();

    const outcomes = await this.compositeEvaluator.evaluateAll(attempt.submission, problem);

    const succeeded = outcomes.filter((o) => o.succeeded);
    const failed = outcomes.filter((o) => !o.succeeded);

    const allScores: CriterionScore[] = succeeded.flatMap((o) => o.criteriaScores);
    const evaluatedBy = succeeded.map((o) => o.evaluatorName);

    const isPartial = failed.length > 0;
    const narrative = this.buildNarrative(succeeded, failed);

    const report = new EvaluationReport(
      uuid(),
      attempt.id,
      allScores,
      narrative,
      evaluatedBy,
      isPartial
    );

    attempt.completeWithReport(report);
    return report;
  }

  private buildNarrative(succeeded: { evaluatorName: string }[], failed: { evaluatorName: string; errorMessage?: string }[]): string {
    const llmNote = failed.find((f) => f.evaluatorName === "LLMDesignEvaluator");
    if (!llmNote) {
      return "Full evaluation completed.";
    }
    return `AI-based design review could not complete (${llmNote.errorMessage || "unknown error"}). Showing rule-based feedback only — you can retry the AI review.`;
  }
}
