import { AttemptStatus } from "./types";
import { Submission } from "./Submission";
import { EvaluationReport } from "./EvaluationReport";

/**
 * Attempt is the aggregate root of the practice loop: one attempt by one
 * learner at one problem. It owns its own status transitions so that
 * "what states are legal" lives in one place instead of being scattered
 * across services.
 */
export class Attempt {
  public submission: Submission | null = null;
  public report: EvaluationReport | null = null;
  public submittedAt: Date | null = null;

  constructor(
    public readonly id: string,
    public readonly problemId: string,
    public readonly learnerId: string,
    public status: AttemptStatus = "DRAFT",
    public readonly createdAt: Date = new Date()
  ) {}

  attachSubmission(submission: Submission) {
    if (this.status !== "DRAFT" && this.status !== "FAILED") {
      throw new Error(
        `Cannot submit an attempt in status ${this.status}. Only DRAFT or FAILED attempts can be (re)submitted.`
      );
    }
    this.submission = submission;
    this.status = "SUBMITTED";
    this.submittedAt = new Date();
  }

  markEvaluating() {
    this.status = "EVALUATING";
  }

  completeWithReport(report: EvaluationReport) {
    this.report = report;
    this.status = report.partial ? "FAILED" : "EVALUATED";
  }

  toJSON() {
    return {
      id: this.id,
      problemId: this.problemId,
      learnerId: this.learnerId,
      status: this.status,
      createdAt: this.createdAt,
      submittedAt: this.submittedAt,
      submission: this.submission,
      report: this.report ? this.report.toJSON() : null,
    };
  }
}
