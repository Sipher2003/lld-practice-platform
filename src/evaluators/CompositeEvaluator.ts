import { Evaluator, EvaluatorError } from "./Evaluator";
import { Problem } from "../domain/Problem";
import { Submission } from "../domain/Submission";
import { EvaluatorOutcome } from "../domain/types";

/**
 * Runs every applicable Evaluator (per `supports()`) and returns one outcome
 * per evaluator, each explicitly marked succeeded/failed. It never throws for
 * an individual evaluator failure — partial success is a first-class outcome,
 * not an error state, because EvaluationService needs to know exactly which
 * evaluators contributed so it can decide whether the overall attempt is
 * EVALUATED or FAILED (see EvaluationService for that policy).
 */
export class CompositeEvaluator {
  constructor(private readonly evaluators: Evaluator[]) {}

  async evaluateAll(submission: Submission, problem: Problem): Promise<EvaluatorOutcome[]> {
    const applicable = this.evaluators.filter((e) => e.supports(submission));

    const results = await Promise.allSettled(
      applicable.map((e) => e.evaluate(submission, problem))
    );

    return results.map((result, i) => {
      const evaluator = applicable[i];
      if (result.status === "fulfilled") {
        return {
          evaluatorName: evaluator.name,
          succeeded: true,
          criteriaScores: result.value,
        };
      }
      const err = result.reason;
      const message =
        err instanceof EvaluatorError ? err.message : err?.message || "Unknown error";
      return {
        evaluatorName: evaluator.name,
        succeeded: false,
        criteriaScores: [],
        errorMessage: message,
      };
    });
  }
}
