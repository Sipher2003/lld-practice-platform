/**
 * A Problem is an LLD prompt with enough context to attempt it meaningfully.
 *
 * `requiredConcepts` exists specifically to support deterministic evaluation:
 * it's a small list of domain concepts a reasonable solution should mention
 * (e.g. "Vehicle", "ParkingSpot", "Ticket" for a Parking Lot problem). This is
 * NOT a hidden "correct answer" — it's a coverage signal, one input among several.
 */
export class Problem {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly description: string,
    public readonly requirements: string[],
    public readonly constraints: string[],
    public readonly difficulty: "EASY" | "MEDIUM" | "HARD",
    public readonly requiredConcepts: string[]
  ) {}

  toSummary() {
    return {
      id: this.id,
      title: this.title,
      difficulty: this.difficulty,
      description: this.description,
    };
  }

  toDetail() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      requirements: this.requirements,
      constraints: this.constraints,
      difficulty: this.difficulty,
    };
  }
}
