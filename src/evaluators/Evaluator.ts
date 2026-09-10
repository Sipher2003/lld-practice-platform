import { Problem } from "../domain/Problem";
import { Submission } from "../domain/Submission";
import { CriterionScore } from "../domain/types";

/**
 * The core extensibility point of the whole system.
 *
 * Adding a new evaluation approach (a stricter linter, a different LLM,
 * a rubric for a new submission format) means writing a new class that
 * implements this interface — nothing else in the system needs to change.
 * `supports()` lets each evaluator opt in/out per submission, so a
 * diagram-specific evaluator simply returns false for text submissions.
 */
export interface Evaluator {
  readonly name: string;
  supports(submission: Submission): boolean;
  evaluate(submission: Submission, problem: Problem): Promise<CriterionScore[]>;
}

export class EvaluatorError extends Error {
  constructor(public evaluatorName: string, message: string) {
    super(message);
    this.name = "EvaluatorError";
  }
}
