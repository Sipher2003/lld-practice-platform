# AI Usage

This project was built working with Claude (Sonnet). Below are the concrete
decisions worth calling out — what was suggested, what was kept or changed,
and why. (Edit this file with your own voice/details before submitting —
these reflect the actual build session and should be adapted to how you
personally worked with the tool.)

## 1. Evaluator extensibility via a strategy interface

**Suggested:** Claude proposed a single `Evaluator` interface
(`supports()` + `evaluate()`) with `StructuralRuleEvaluator`,
`LLMDesignEvaluator`, and a `CompositeEvaluator` to run them together, rather
than hardcoding "run rules, then call the LLM" as one procedural function.

**Accepted, with reasoning:** This directly answers the brief's extensibility
question — a new submission format or a second AI provider becomes one new
class, not a rewrite of the evaluation pipeline. Kept as designed.

## 2. Failure handling for the LLM evaluator

**Suggested:** Claude initially suggested a retry-with-exponential-backoff
queue for handling slow/failing AI calls.

**Rejected:** The assignment explicitly says to keep failure handling
practical and not turn it into a distributed-systems project. Replaced with
a simple `AbortController` timeout + a `partial` flag on the report + a
manual "Retry" button. The more sophisticated approach is documented as a
"next step at scale" in `DESIGN_NOTE.md` instead of being built.

## 3. Mock fallback when no API key is present

**Suggested:** Claude suggested making `LLMDesignEvaluator` fall back to a
clearly-labeled mock evaluator (`[MOCK]` prefix in every comment) when
`ANTHROPIC_API_KEY` isn't set, instead of requiring a key just to run the app.

**Accepted:** This makes the whole practice loop demoable/testable without
credentials, which matters for anyone reviewing the prototype. The `[MOCK]`
labeling was kept non-negotiable so mock feedback is never mistaken for a
real design review.

## 4. Deterministic "structural completeness" heuristic

**Suggested:** Claude proposed counting distinct `class`/`interface`
declarations mentioned in a text submission as a proxy for a "God Object"
smell (0-1 types = likely one class doing everything).

**Accepted, with a caveat added:** This is a rough heuristic (a learner could
describe multiple types without using the literal word "class"), so the
comment text explicitly frames it as a signal to check, not a verdict — the
LLM evaluator is described as doing the real judgment on responsibility
assignment.

## 5. In-memory storage vs. a real database

**Suggested:** Claude suggested SQLite for persistence.

**Changed during implementation:** Given the 2-day scope, switched to
in-memory `Map`-based repositories behind the same small interface an SQLite
implementation would have used, to spend the available time on the domain
model and evaluators rather than schema/migration setup. This is called out
explicitly as a limitation in `README.md`, with the repository interface
designed so swapping in real persistence later doesn't touch anything above it.
