import { StructuralRuleEvaluator } from "../src/evaluators/StructuralRuleEvaluator";
import { Problem } from "../src/domain/Problem";
import { Submission } from "../src/domain/Submission";

const problem = new Problem(
  "p1",
  "Test Problem",
  "desc",
  ["The system should track Vehicles.", "The system should issue a Ticket."],
  [],
  "EASY",
  ["Vehicle", "Ticket", "ParkingSpot"]
);

function makeSubmission(content: string) {
  return new Submission("s1", "a1", "TEXT_DESIGN", content);
}

describe("StructuralRuleEvaluator", () => {
  const evaluator = new StructuralRuleEvaluator();

  it("supports TEXT_DESIGN and CODE, not DIAGRAM", () => {
    expect(evaluator.supports(makeSubmission("x"))).toBe(true);
    expect(evaluator.supports(new Submission("s2", "a1", "DIAGRAM", "x"))).toBe(false);
  });

  it("scores low concept coverage when required concepts are missing", async () => {
    const scores = await evaluator.evaluate(makeSubmission("Just some notes."), problem);
    const coverage = scores.find((s) => s.criterion === "Concept Coverage")!;
    expect(coverage.score).toBe(0);
  });

  it("scores full concept coverage when all required concepts are mentioned", async () => {
    const submission = makeSubmission(
      "class Vehicle {} class Ticket {} class ParkingSpot {} they interact together."
    );
    const scores = await evaluator.evaluate(submission, problem);
    const coverage = scores.find((s) => s.criterion === "Concept Coverage")!;
    expect(coverage.score).toBe(10);
  });

  it("flags a submission with zero declared types as a structural smell", async () => {
    const scores = await evaluator.evaluate(makeSubmission("I will use one big function."), problem);
    const structural = scores.find((s) => s.criterion === "Structural Completeness")!;
    expect(structural.score).toBeLessThanOrEqual(2);
  });

  it("scores higher structural completeness with multiple distinct types", async () => {
    const submission = makeSubmission(
      "class Vehicle {} class Ticket {} class ParkingSpot {} interface Payable {}"
    );
    const scores = await evaluator.evaluate(submission, problem);
    const structural = scores.find((s) => s.criterion === "Structural Completeness")!;
    expect(structural.score).toBeGreaterThanOrEqual(7);
  });
});
