/**
 * Shared value types for the domain layer.
 * Kept framework-free on purpose: nothing here knows about Express, HTTP,
 * or any storage mechanism. That separation is a deliberate LLD decision —
 * business rules should not depend on delivery mechanisms.
 */

export type SubmissionFormat = "TEXT_DESIGN" | "CODE" | "DIAGRAM";

export type AttemptStatus =
  | "DRAFT" // created, learner is still working
  | "SUBMITTED" // learner submitted, evaluation not started yet
  | "EVALUATING" // evaluation in progress (at least one evaluator running)
  | "EVALUATED" // all evaluators completed successfully
  | "FAILED"; // at least one required evaluator failed/timed out

export interface CriterionScore {
  criterion: string;
  score: number; // 0-10
  comment: string;
}

export interface EvaluatorOutcome {
  evaluatorName: string;
  succeeded: boolean;
  criteriaScores: CriterionScore[];
  narrative?: string;
  errorMessage?: string;
}
