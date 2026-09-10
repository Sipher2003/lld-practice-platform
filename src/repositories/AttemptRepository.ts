import { Attempt } from "../domain/Attempt";

export class AttemptRepository {
  private attempts = new Map<string, Attempt>();
  // Insertion order is tracked separately from createdAt because two attempts
  // can legitimately share a millisecond timestamp; insertion order is the
  // reliable tiebreaker for "most recent first".
  private insertionOrder: string[] = [];

  save(attempt: Attempt): Attempt {
    if (!this.attempts.has(attempt.id)) {
      this.insertionOrder.push(attempt.id);
    }
    this.attempts.set(attempt.id, attempt);
    return attempt;
  }

  findById(id: string): Attempt | undefined {
    return this.attempts.get(id);
  }

  findByLearner(learnerId: string, problemId?: string): Attempt[] {
    return this.insertionOrder
      .map((id) => this.attempts.get(id)!)
      .filter((a) => a.learnerId === learnerId)
      .filter((a) => (problemId ? a.problemId === problemId : true))
      .reverse(); // most recently inserted first
  }
}
