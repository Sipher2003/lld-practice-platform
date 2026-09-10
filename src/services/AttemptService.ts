import { v4 as uuid } from "uuid";
import { Attempt } from "../domain/Attempt";
import { Submission } from "../domain/Submission";
import { SubmissionFormat } from "../domain/types";
import { AttemptRepository } from "../repositories/AttemptRepository";
import { ProblemRepository } from "../repositories/ProblemRepository";
import { EvaluationService } from "./EvaluationService";

/**
 * The main use-case layer for the practice loop:
 * choose problem -> start attempt -> submit -> get feedback -> review -> retry.
 *
 * Evaluation is kicked off asynchronously (fire-and-forget from the caller's
 * perspective) so the HTTP layer can return immediately with status
 * SUBMITTED/EVALUATING, and the client polls GET /attempts/:id for the result.
 * This is the simplest thing that satisfies "what happens if evaluation takes
 * time" without introducing a job queue.
 */
export class AttemptService {
  constructor(
    private readonly attemptRepo: AttemptRepository,
    private readonly problemRepo: ProblemRepository,
    private readonly evaluationService: EvaluationService
  ) {}

  startAttempt(problemId: string, learnerId: string): Attempt {
    const problem = this.problemRepo.findById(problemId);
    if (!problem) throw new Error(`Unknown problem: ${problemId}`);

    const attempt = new Attempt(uuid(), problemId, learnerId);
    return this.attemptRepo.save(attempt);
  }

  async submitAttempt(
    attemptId: string,
    content: string,
    format: SubmissionFormat
  ): Promise<Attempt> {
    const attempt = this.requireAttempt(attemptId);
    const problem = this.problemRepo.findById(attempt.problemId);
    if (!problem) throw new Error(`Unknown problem: ${attempt.problemId}`);

    if (!content || content.trim().length === 0) {
      throw new Error("Submission content cannot be empty.");
    }

    const submission = new Submission(uuid(), attempt.id, format, content);
    attempt.attachSubmission(submission);
    this.attemptRepo.save(attempt);

    // Fire-and-forget: evaluation runs async, attempt status updates in place.
    // Errors here are already captured into the report by EvaluationService,
    // so this catch is a last-resort safety net for truly unexpected failures.
    this.evaluationService.evaluate(attempt, problem).catch((err) => {
      console.error(`Unexpected evaluation failure for attempt ${attempt.id}:`, err);
    });

    return attempt;
  }

  async retryEvaluation(attemptId: string): Promise<Attempt> {
    const attempt = this.requireAttempt(attemptId);
    const problem = this.problemRepo.findById(attempt.problemId);
    if (!problem) throw new Error(`Unknown problem: ${attempt.problemId}`);
    if (attempt.status !== "FAILED") {
      throw new Error("Can only retry evaluation for a FAILED attempt.");
    }
    await this.evaluationService.evaluate(attempt, problem);
    this.attemptRepo.save(attempt);
    return attempt;
  }

  getAttempt(attemptId: string): Attempt {
    return this.requireAttempt(attemptId);
  }

  getHistory(learnerId: string, problemId?: string): Attempt[] {
    return this.attemptRepo.findByLearner(learnerId, problemId);
  }

  private requireAttempt(attemptId: string): Attempt {
    const attempt = this.attemptRepo.findById(attemptId);
    if (!attempt) throw new Error(`Unknown attempt: ${attemptId}`);
    return attempt;
  }
}
