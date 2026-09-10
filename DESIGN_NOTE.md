# Design Note

## MVP scope

**In scope:**
- 3 seeded LLD problems (Parking Lot, Elevator System, Vending Machine) with
  requirements, constraints, and a small set of expected domain concepts.
- One submission format: a free-text design write-up (prose, pseudo-code, or
  a mix — the learner describes classes/interfaces and their responsibilities).
- Full practice loop: choose problem → attempt → submit → async evaluation →
  structured feedback → attempt history → retry.
- Two evaluation strategies combined: a deterministic rule-based evaluator and
  an LLM-based design evaluator, merged into one report.
- Graceful handling of slow/failed AI evaluation (timeout → partial report +
  manual retry).

**Explicitly out of scope (and why):**
- **Authentication / multi-user accounts** — a single demo learner id is
  enough to demonstrate the loop and history; auth is orthogonal to the LLD
  problem this assignment is about.
- **Diagram/image submission** — the richest signal for feedback (text
  describing responsibilities and relationships) is also the cheapest to
  evaluate; diagrams would need OCR/vision parsing that adds engineering
  cost without adding LLD-design value for an MVP.
- **Admin CMS for authoring problems** — 3 hardcoded, well-written problems
  demonstrate the "Problem" domain concept fully; an authoring UI is a
  separate product surface.
- **Distributed job queue for evaluation** — a single async function with a
  timeout is enough for the request volume this MVP targets, and the brief
  explicitly asks not to turn this into a distributed-systems exercise.

## User flow

```
Problem list -> select problem -> Attempt created (DRAFT)
  -> learner writes design in text area -> Submit
  -> Attempt: SUBMITTED -> EVALUATING (rule-based runs sync, LLM runs async)
  -> Attempt: EVALUATED (both succeeded) | FAILED (LLM failed/timed out, partial report)
  -> Feedback screen shows per-criterion scores + narrative
  -> History panel lists all past attempts on this problem, clickable to review
  -> "Retry AI evaluation" available on a FAILED attempt
```

## Core classes and responsibilities

| Class | Responsibility |
|---|---|
| `Problem` | Immutable definition of an LLD prompt: description, requirements, constraints, and `requiredConcepts` (a coverage signal for deterministic checks). |
| `Submission` | The learner's content for one attempt, tagged with an explicit `format`. |
| `Attempt` | Aggregate root of the practice loop. Owns its own status machine (`DRAFT → SUBMITTED → EVALUATING → EVALUATED / FAILED`) so legal transitions live in one place. |
| `EvaluationReport` | Immutable result of evaluation: per-criterion scores, narrative, which evaluators contributed, and whether it's `partial`. |
| `Evaluator` (interface) | The extensibility seam: `supports(submission)` + `evaluate(submission, problem)`. |
| `StructuralRuleEvaluator` | Deterministic checks: concept coverage, structural completeness (distinct class/interface count as a "God Object" smell detector), rough requirements coverage. |
| `LLMDesignEvaluator` | Judgment-based checks: responsibility assignment, abstraction level, coupling, extensibility, trade-off reasoning. Enforces a hard timeout and degrades to a clearly-labeled mock when no API key is configured, so the whole loop is runnable without credentials. |
| `CompositeEvaluator` | Runs every applicable evaluator, and — critically — never lets one evaluator's failure crash the others; returns per-evaluator success/failure outcomes. |
| `EvaluationService` | Owns the policy for what counts as a fully evaluated vs. failed attempt, and builds the final report from whichever evaluators succeeded. |
| `AttemptService` | Use-case orchestrator for the practice loop (start/submit/retry/history); the only layer that talks to repositories. |
| `ProblemRepository` / `AttemptRepository` | In-memory storage behind a small interface, so swapping in a real database later doesn't touch anything above this layer. |

## Evaluation approach: deterministic vs. LLM

| Deterministic (`StructuralRuleEvaluator`) | LLM-based (`LLMDesignEvaluator`) |
|---|---|
| Concept coverage against `Problem.requiredConcepts` | Is the responsibility split sensible (SRP)? |
| Structural completeness — counts distinct classes/interfaces as a proxy for a "God Object" smell | Is the abstraction level appropriate — not over- or under-engineered? |
| Rough keyword-based requirements coverage | Are relationships (composition/inheritance/interfaces) reasonable for the stated requirements? |
| — | Did the learner reason about trade-offs, and is that reasoning defensible? |
| — | Free-form, submission-specific narrative feedback |

The dividing line: **anything objectively checkable without judgment goes in
the rule-based evaluator; anything where "more than one valid answer" applies
goes to the LLM**, which is prompted explicitly to judge internal consistency
against the stated requirements rather than match a single reference solution.

## Extensibility

- **New submission format** (e.g. diagrams): add a new `SubmissionFormat`
  value and a new `Evaluator` implementation whose `supports()` checks for
  that format. No changes needed to `Attempt`, `EvaluationService`, or the API.
- **New evaluation approach** (e.g. a stricter linter, a second LLM for a
  second opinion, a rubric-specific evaluator for a specific problem):
  implement `Evaluator` and register it in the composition root
  (`src/api/server.ts`). `CompositeEvaluator` picks it up automatically.
- **New problems**: add to the `Problem` seed list; nothing else changes.

## Failure handling

`LLMDesignEvaluator` is wrapped in an `AbortController`-based timeout (20s
default). If it fails or times out:
- `CompositeEvaluator` captures this as a failed outcome rather than throwing.
- `EvaluationService` still builds a report from whatever evaluators
  succeeded (here, the deterministic one), marks it `partial: true`, and sets
  the attempt to `FAILED`.
- The learner sees real feedback immediately (not a blank error) plus a
  "Retry AI evaluation" action that re-runs evaluation without losing the
  submission or the earlier rule-based scores.

This was kept intentionally simple — no retry queue, no backoff, no
persistence of in-flight jobs — per the assignment's guidance not to turn
this into a distributed-systems exercise. At real scale, the obvious next
step is a durable job queue (e.g. a `pending_evaluations` table + worker)
so evaluation survives a server restart, plus automatic retry with backoff
instead of a manual button.

## Known trade-offs / limitations

- Storage is in-memory (`Map`-based repositories) — all data is lost on
  restart. Chosen to keep the 2-day scope focused on the domain model rather
  than persistence/migrations; swapping in SQLite/Postgres only requires
  reimplementing the two repository classes.
- The deterministic evaluator's "requirements addressed" check is a crude
  keyword heuristic, not real NLP — it's explicitly framed to the learner as
  a rough signal, with the LLM review doing the real judgment.
- Single hardcoded demo learner — no auth, so "history" is really "history
  for the one demo user," but the domain model (`learnerId` on every
  `Attempt`) already supports multiple learners.
