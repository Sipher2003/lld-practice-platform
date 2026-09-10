import { SubmissionFormat } from "./types";

/**
 * A Submission is the content a learner hands in for one Attempt.
 * The format is explicit and typed so new formats (CODE, DIAGRAM) can be
 * added later without touching Attempt or the evaluators that don't care
 * about format-specific parsing.
 */
export class Submission {
  constructor(
    public readonly id: string,
    public readonly attemptId: string,
    public readonly format: SubmissionFormat,
    public readonly content: string,
    public readonly createdAt: Date = new Date()
  ) {}
}
