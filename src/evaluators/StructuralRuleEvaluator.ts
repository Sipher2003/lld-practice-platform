import { Evaluator } from "./Evaluator";
import { Problem } from "../domain/Problem";
import { Submission } from "../domain/Submission";
import { CriterionScore } from "../domain/types";

/**
 * Deterministic, fast, and cheap. Runs synchronously on every submission.
 *
 * This evaluator answers "which parts of evaluation should be deterministic":
 * things that are objectively checkable and don't require judgment —
 * structural completeness, concept coverage, and a couple of obvious
 * anti-pattern smells. It intentionally does NOT try to judge whether the
 * design is *good* — that requires reasoning, which is the LLM evaluator's job.
 */
export class StructuralRuleEvaluator implements Evaluator {
  readonly name = "StructuralRuleEvaluator";

  supports(submission: Submission): boolean {
    // Works for any text-bearing submission; would return false for a
    // future binary/image DIAGRAM format that needs different parsing.
    return submission.format === "TEXT_DESIGN" || submission.format === "CODE";
  }

  async evaluate(submission: Submission, problem: Problem): Promise<CriterionScore[]> {
    const content = submission.content;
    const lower = content.toLowerCase();

    return [
      this.scoreConceptCoverage(lower, problem),
      this.scoreStructuralCompleteness(content),
      this.scoreRequirementsAddressed(lower, problem),
    ];
  }

  private scoreConceptCoverage(lowerContent: string, problem: Problem): CriterionScore {
    if (problem.requiredConcepts.length === 0) {
      return {
        criterion: "Concept Coverage",
        score: 10,
        comment: "No required concepts defined for this problem.",
      };
    }
    const mentioned = problem.requiredConcepts.filter((c) =>
      lowerContent.includes(c.toLowerCase())
    );
    const ratio = mentioned.length / problem.requiredConcepts.length;
    const missing = problem.requiredConcepts.filter(
      (c) => !mentioned.includes(c)
    );
    return {
      criterion: "Concept Coverage",
      score: Math.round(ratio * 10),
      comment:
        missing.length === 0
          ? "All core domain concepts for this problem are addressed."
          : `Consider addressing: ${missing.join(", ")}.`,
    };
  }

  private scoreStructuralCompleteness(content: string): CriterionScore {
    // Heuristic anti-pattern check: count distinct class/interface declarations
    // mentioned. A submission with 0-1 classes for a multi-entity problem is
    // a strong "God Object" smell worth flagging deterministically.
    const classMatches = content.match(/\b(class|interface)\s+[A-Z][A-Za-z0-9_]*/g) || [];
    const distinctTypes = new Set(classMatches.map((m) => m.split(/\s+/)[1]));
    const count = distinctTypes.size;

    let score: number;
    let comment: string;
    if (count === 0) {
      score = 2;
      comment =
        "No explicit classes or interfaces detected. Name the concrete types in your design, even in a text write-up (e.g. 'class ParkingSpot').";
    } else if (count === 1) {
      score = 4;
      comment =
        "Only one type detected — this often signals a single class doing too much (low cohesion). Consider whether responsibilities should be split.";
    } else if (count <= 3) {
      score = 7;
      comment = `${count} types detected. Reasonable start — check each has a single clear responsibility.`;
    } else {
      score = 9;
      comment = `${count} distinct types detected, suggesting responsibilities are broken down.`;
    }
    return { criterion: "Structural Completeness", score, comment };
  }

  private scoreRequirementsAddressed(lowerContent: string, problem: Problem): CriterionScore {
    if (problem.requirements.length === 0) {
      return { criterion: "Requirements Addressed", score: 10, comment: "N/A" };
    }
    // Very light heuristic: look for a keyword from each requirement sentence.
    const addressed = problem.requirements.filter((req) => {
      const keyword = req
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(" ")
        .filter((w) => w.length > 4)[0]; // first "meaningful" word
      return keyword ? lowerContent.includes(keyword) : false;
    });
    const ratio = addressed.length / problem.requirements.length;
    return {
      criterion: "Requirements Addressed",
      score: Math.round(ratio * 10),
      comment: `Heuristically detected coverage for ${addressed.length}/${problem.requirements.length} stated requirements. This is a rough signal, not a guarantee — the LLM review below looks at this more carefully.`,
    };
  }
}
