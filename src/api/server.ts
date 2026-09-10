import express from "express";
import cors from "cors";
import path from "path";
import { ProblemRepository } from "../repositories/ProblemRepository";
import { AttemptRepository } from "../repositories/AttemptRepository";
import { AttemptService } from "../services/AttemptService";
import { EvaluationService } from "../services/EvaluationService";
import { CompositeEvaluator } from "../evaluators/CompositeEvaluator";
import { StructuralRuleEvaluator } from "../evaluators/StructuralRuleEvaluator";
import { LLMDesignEvaluator } from "../evaluators/LLMDesignEvaluator";
import { seedProblems } from "../data/problems";
import { buildRouter } from "./routes";

/**
 * Composition root: this is the one place that knows how all the pieces
 * are wired together. Everything else only depends on interfaces/abstract
 * collaborators passed into it (constructor injection), which is what makes
 * the domain and service layers independently testable — see /tests.
 */
export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  const problemRepo = new ProblemRepository(seedProblems);
  const attemptRepo = new AttemptRepository();

  const compositeEvaluator = new CompositeEvaluator([
    new StructuralRuleEvaluator(),
    new LLMDesignEvaluator(),
  ]);
  const evaluationService = new EvaluationService(compositeEvaluator);
  const attemptService = new AttemptService(attemptRepo, problemRepo, evaluationService);

  app.use("/api", buildRouter(problemRepo, attemptService));

  // Serve the minimal frontend
  app.use(express.static(path.join(__dirname, "..", "..", "public")));

  return app;
}
