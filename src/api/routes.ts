import { Router, Request, Response } from "express";
import { ProblemRepository } from "../repositories/ProblemRepository";
import { AttemptService } from "../services/AttemptService";

export function buildRouter(
  problemRepo: ProblemRepository,
  attemptService: AttemptService
): Router {
  const router = Router();

  // --- Problems -------------------------------------------------------
  router.get("/problems", (_req: Request, res: Response) => {
    res.json(problemRepo.findAll().map((p) => p.toSummary()));
  });

  router.get("/problems/:id", (req: Request, res: Response) => {
    const problem = problemRepo.findById(req.params.id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });
    res.json(problem.toDetail());
  });

  // --- Attempts ---------------------------------------------------------
  router.post("/attempts", (req: Request, res: Response) => {
    const { problemId, learnerId } = req.body;
    if (!problemId || !learnerId) {
      return res.status(400).json({ error: "problemId and learnerId are required" });
    }
    try {
      const attempt = attemptService.startAttempt(problemId, learnerId);
      res.status(201).json(attempt.toJSON());
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get("/attempts/:id", (req: Request, res: Response) => {
    try {
      const attempt = attemptService.getAttempt(req.params.id);
      res.json(attempt.toJSON());
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  });

  router.post("/attempts/:id/submit", async (req: Request, res: Response) => {
    const { content, format } = req.body;
    try {
      const attempt = await attemptService.submitAttempt(
        req.params.id,
        content,
        format || "TEXT_DESIGN"
      );
      // Returned immediately at status SUBMITTED/EVALUATING; client polls for the report.
      res.status(202).json(attempt.toJSON());
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post("/attempts/:id/retry-evaluation", async (req: Request, res: Response) => {
    try {
      const attempt = await attemptService.retryEvaluation(req.params.id);
      res.json(attempt.toJSON());
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- History ------------------------------------------------------------
  router.get("/learners/:learnerId/attempts", (req: Request, res: Response) => {
    const problemId = req.query.problemId as string | undefined;
    const attempts = attemptService.getHistory(req.params.learnerId, problemId);
    res.json(attempts.map((a) => a.toJSON()));
  });

  return router;
}
