import { Problem } from "../domain/Problem";

/**
 * In-memory on purpose for this scope (see README limitations). Swapping
 * this for a database-backed implementation later only means implementing
 * this same small interface — nothing above this layer changes.
 */
export class ProblemRepository {
  private problems = new Map<string, Problem>();

  constructor(seed: Problem[] = []) {
    seed.forEach((p) => this.problems.set(p.id, p));
  }

  findAll(): Problem[] {
    return Array.from(this.problems.values());
  }

  findById(id: string): Problem | undefined {
    return this.problems.get(id);
  }
}
