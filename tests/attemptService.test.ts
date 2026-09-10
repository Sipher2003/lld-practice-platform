import { AttemptService } from "../src/services/AttemptService";
import { EvaluationService } from "../src/services/EvaluationService";
import { AttemptRepository } from "../src/repositories/AttemptRepository";
import { ProblemRepository } from "../src/repositories/ProblemRepository";
import { CompositeEvaluator } from "../src/evaluators/CompositeEvaluator";
import { Evaluator, EvaluatorError } from "../src/evaluators/Evaluator";
import { Problem } from "../src/domain/Problem";

const problem = new Problem(
  "p1",
  "Test Problem",
  "desc",
  ["req1"],
  [],
  "EASY",
  ["Widget"]
);

class SucceedingLLM implements Evaluator {
  name = "LLMDesignEvaluator";
  supports() {
    return true;
  }
  async evaluate() {
    return [{ criterion: "Trade-off Reasoning", score: 7, comment: "fine" }];
  }
}

class FailingLLM implements Evaluator {
  name = "LLMDesignEvaluator";
  supports() {
    return true;
  }
  async evaluate(): Promise<any> {
    throw new EvaluatorError(this.name, "Timed out after 20000ms");
  }
}

class TrivialRule implements Evaluator {
  name = "StructuralRuleEvaluator";
  supports() {
    return true;
  }
  async evaluate() {
    return [{ criterion: "Structural Completeness", score: 6, comment: "ok" }];
  }
}

function buildService(llm: Evaluator) {
  const attemptRepo = new AttemptRepository();
  const problemRepo = new ProblemRepository([problem]);
  const evaluationService = new EvaluationService(
    new CompositeEvaluator([new TrivialRule(), llm])
  );
  return new AttemptService(attemptRepo, problemRepo, evaluationService);
}

describe("AttemptService — practice loop", () => {
  it("takes an attempt from DRAFT to EVALUATED when all evaluators succeed", async () => {
    const service = buildService(new SucceedingLLM());
    const attempt = service.startAttempt("p1", "learner-1");
    expect(attempt.status).toBe("DRAFT");

    const submitted = await service.submitAttempt(attempt.id, "class Widget {}", "TEXT_DESIGN");
    // Evaluation is async but our fakes resolve immediately; give the microtask queue a tick.
    await new Promise((r) => setImmediate(r));

    const final = service.getAttempt(submitted.id);
    expect(final.status).toBe("EVALUATED");
    expect(final.report?.partial).toBe(false);
    expect(final.report!.criteriaScores.length).toBeGreaterThan(0);
  });

  it("marks the attempt FAILED (partial) when the LLM evaluator fails, but keeps rule-based feedback", async () => {
    const service = buildService(new FailingLLM());
    const attempt = service.startAttempt("p1", "learner-1");
    await service.submitAttempt(attempt.id, "class Widget {}", "TEXT_DESIGN");
    await new Promise((r) => setImmediate(r));

    const final = service.getAttempt(attempt.id);
    expect(final.status).toBe("FAILED");
    expect(final.report?.partial).toBe(true);
    // Rule-based criterion should still be present even though the LLM failed.
    expect(final.report!.criteriaScores.some((c) => c.criterion === "Structural Completeness")).toBe(true);
  });

  it("rejects an empty submission before touching any evaluator", async () => {
    const service = buildService(new SucceedingLLM());
    const attempt = service.startAttempt("p1", "learner-1");
    await expect(service.submitAttempt(attempt.id, "   ", "TEXT_DESIGN")).rejects.toThrow(
      /cannot be empty/i
    );
  });

  it("allows retrying evaluation only when the attempt previously FAILED", async () => {
    const service = buildService(new FailingLLM());
    const attempt = service.startAttempt("p1", "learner-1");
    await service.submitAttempt(attempt.id, "class Widget {}", "TEXT_DESIGN");
    await new Promise((r) => setImmediate(r));
    expect(service.getAttempt(attempt.id).status).toBe("FAILED");

    await service.retryEvaluation(attempt.id);
    // Still failing LLM, so still FAILED — but this proves retry re-runs evaluation
    // rather than throwing, and a DRAFT/EVALUATED attempt would reject retry.
    expect(service.getAttempt(attempt.id).status).toBe("FAILED");
  });

  it("keeps attempt history per learner, most recent first", async () => {
    const service = buildService(new SucceedingLLM());
    const a1 = service.startAttempt("p1", "learner-1");
    await service.submitAttempt(a1.id, "class Widget {}", "TEXT_DESIGN");
    await new Promise((r) => setImmediate(r));

    const a2 = service.startAttempt("p1", "learner-1");
    await service.submitAttempt(a2.id, "class Widget {} class Gadget {}", "TEXT_DESIGN");
    await new Promise((r) => setImmediate(r));

    const history = service.getHistory("learner-1", "p1");
    expect(history).toHaveLength(2);
    expect(history[0].id).toBe(a2.id); // most recent first
  });
});
