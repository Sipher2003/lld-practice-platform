# LLD Practice Platform

A small end-to-end prototype that lets a learner pick an LLD problem, submit a
design, get structured feedback (rule-based + optional AI review), and see
their attempt history — see `RESEARCH_NOTE.md` and `DESIGN_NOTE.md` for the
reasoning behind the product and architecture.

## Quick start

```bash
npm install
npm run dev
```

Then open **http://localhost:3000** in a browser.

By default there is no `GROQ_API_KEY` set, so the AI review evaluator
runs in **mock mode** (clearly labeled `[MOCK]` in the feedback so it's never
mistaken for a real review) — the whole practice loop, including the async
evaluation flow, works without any credentials.

### Enabling real AI feedback

```bash
export GROQ_API_KEY=gsk_...
npm run dev
```

The evaluator uses Groq's OpenAI-compatible chat completions API with the
`llama-3.1-8b-instant` model.

### Production build

```bash
npm run build
npm start
```

### Running tests

```bash
npm test
```

12 tests covering: deterministic scoring logic, the composite evaluator's
partial-failure handling, and the full attempt lifecycle (success, LLM
failure/timeout, empty-submission rejection, retry, and history ordering).

## How it works

1. **Choose a problem** from the seeded list (Parking Lot, Elevator System,
   Vending Machine).
2. **Write your design** as free text/pseudo-code describing your classes,
   their responsibilities, and how they relate.
3. **Submit** — a rule-based evaluator runs instantly; an AI-based evaluator
   runs asynchronously (the UI polls for completion).
4. **Review feedback** — per-criterion scores (0-10) with specific comments,
   plus an overall narrative. If the AI evaluator failed or timed out, you
   still get the rule-based feedback and a "Retry AI evaluation" button.
5. **Check history** — every past attempt on the current problem is listed
   with its score, so you can track improvement across retries.

## Project structure

```
src/
  domain/        Problem, Submission, Attempt, EvaluationReport — framework-free entities
  evaluators/     Evaluator interface + StructuralRuleEvaluator, LLMDesignEvaluator, CompositeEvaluator
  services/       AttemptService (use-case orchestration), EvaluationService (evaluation policy)
  repositories/   In-memory ProblemRepository, AttemptRepository
  data/           Seeded problems
  api/            Express routes + composition root (server.ts)
public/           Minimal vanilla-JS frontend (no build step)
tests/            Jest tests
```

## Known limitations

- **In-memory storage** — all data resets on server restart. Swapping in a
  real database only requires reimplementing the two repository classes
  (their interface is already the seam).
- **Single demo learner** — no auth; `learnerId` is hardcoded in the frontend
  as `"demo-learner"`, but the domain model already supports multiple learners.
- **One submission format** (`TEXT_DESIGN`) is wired up; `CODE` is accepted by
  the evaluators too, `DIAGRAM` is defined in the type system but has no
  evaluator yet — see `DESIGN_NOTE.md` for how a diagram evaluator would plug in.
- **No persistence of in-flight evaluation jobs** — if the server restarts
  mid-evaluation, that evaluation is lost (the attempt stays `EVALUATING`
  forever). Acceptable for this scope; the fix at real scale is a durable
  job table, noted in the Design Note.

See `AI_USAGE.md` for how AI tools were used while building this.
