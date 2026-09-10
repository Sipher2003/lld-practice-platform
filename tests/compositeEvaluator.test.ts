import { CompositeEvaluator } from "../src/evaluators/CompositeEvaluator";
import { Evaluator, EvaluatorError } from "../src/evaluators/Evaluator";
import { Problem } from "../src/domain/Problem";
import { Submission } from "../src/domain/Submission";

const problem = new Problem("p1", "T", "d", [], [], "EASY", []);
const submission = new Submission("s1", "a1", "TEXT_DESIGN", "content");

class AlwaysSucceeds implements Evaluator {
  name = "AlwaysSucceeds";
  supports() {
    return true;
  }
  async evaluate() {
    return [{ criterion: "X", score: 8, comment: "ok" }];
  }
}

class AlwaysFails implements Evaluator {
  name = "AlwaysFails";
  supports() {
    return true;
  }
  async evaluate(): Promise<any> {
    throw new EvaluatorError(this.name, "simulated timeout");
  }
}

class DoesNotApply implements Evaluator {
  name = "DoesNotApply";
  supports() {
    return false;
  }
  async evaluate() {
    return [{ criterion: "Y", score: 10, comment: "should never run" }];
  }
}

describe("CompositeEvaluator", () => {
  it("merges outcomes from evaluators that support the submission", async () => {
    const composite = new CompositeEvaluator([new AlwaysSucceeds(), new DoesNotApply()]);
    const outcomes = await composite.evaluateAll(submission, problem);
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].evaluatorName).toBe("AlwaysSucceeds");
    expect(outcomes[0].succeeded).toBe(true);
  });

  it("captures a failing evaluator as a failed outcome instead of throwing", async () => {
    const composite = new CompositeEvaluator([new AlwaysSucceeds(), new AlwaysFails()]);
    const outcomes = await composite.evaluateAll(submission, problem);
    const succeeded = outcomes.find((o) => o.evaluatorName === "AlwaysSucceeds")!;
    const failed = outcomes.find((o) => o.evaluatorName === "AlwaysFails")!;
    expect(succeeded.succeeded).toBe(true);
    expect(failed.succeeded).toBe(false);
    expect(failed.errorMessage).toMatch(/simulated timeout/);
  });
});
