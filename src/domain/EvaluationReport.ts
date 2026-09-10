import { CriterionScore } from "./types";

/**
 * The result of running one or more Evaluators against a Submission.
 * `partial` is true when a required evaluator (e.g. the LLM one) failed —
 * the learner still gets whatever feedback did succeed, rather than nothing.
 */
export class EvaluationReport {
  constructor(
    public readonly id: string,
    public readonly attemptId: string,
    public readonly criteriaScores: CriterionScore[],
    public readonly narrativeFeedback: string,
    public readonly evaluatedBy: string[],
    public readonly partial: boolean,
    public readonly generatedAt: Date = new Date()
  ) {}

  get overallScore(): number {
    if (this.criteriaScores.length === 0) return 0;
    const sum = this.criteriaScores.reduce((acc, c) => acc + c.score, 0);
    return Math.round((sum / this.criteriaScores.length) * 10) / 10;
  }

  toJSON() {
    return {
      id: this.id,
      attemptId: this.attemptId,
      overallScore: this.overallScore,
      criteriaScores: this.criteriaScores,
      narrativeFeedback: this.narrativeFeedback,
      evaluatedBy: this.evaluatedBy,
      partial: this.partial,
      generatedAt: this.generatedAt,
    };
  }
}
