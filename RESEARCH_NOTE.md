# Research Note

## The learner problem

Low-Level Design is easy to *attempt* and hard to *self-verify*. A learner can
design a Parking Lot, Elevator, or Vending Machine and produce something that
compiles and "works," but has no reliable way to tell whether the responsibility
split, abstraction level, or relationships between classes are actually good —
because for most LLD problems there is no single correct answer, only better or
worse trade-offs given the stated requirements.

This is different from algorithmic practice (LeetCode-style), where correctness
is binary and checkable by running test cases against a known answer.

## Existing approaches and their gaps

- **Coding practice platforms (LeetCode, HackerRank)**: excellent problem
  selection and submission UX, but evaluation is purely correctness-based
  (test cases pass/fail). They have no concept of "design quality" because
  their problems don't require one.
- **Diagramming tools (Excalidraw, draw.io, system-design practice sites)**:
  good for producing a diagram, but provide no feedback at all — the learner
  still has to find their own reviewer.
- **Mock interview platforms (Pramp, interviewing.io)**: feedback comes from a
  human peer or interviewer, which is high-quality but not scalable, not
  available on demand, and not consistent between reviewers.
- **General LLD course repos / YouTube solutions**: show *a* solution, but
  looking at a reference is not the same as getting feedback on your own
  design, and doesn't support the "attempt → feedback → retry" loop that
  builds skill over time.

The common gap: nothing combines (1) a repeatable practice loop, (2) feedback
that's specific to the learner's own submission rather than a generic
checklist, and (3) a way to track improvement across attempts.

## Product direction

Build a focused practice loop — choose problem, design, submit, get feedback,
review history, try again — where feedback is a blend of:
- **Deterministic checks** for things that are objectively verifiable (did the
  learner define distinct classes/interfaces, did they touch the domain
  concepts a reasonable solution needs, did they address the stated
  requirements at a surface level). These are fast, free, and 100% consistent.
- **LLM-based review** for things that require judgment (is the responsibility
  split sensible, is the abstraction appropriate for the stated constraints,
  did they reason about trade-offs). This is where "more than one valid
  solution" gets handled — the LLM is asked to judge internal consistency and
  fit to requirements, not match against one reference answer.

Scope for the MVP is deliberately narrow: 3 seeded problems, one submission
format (a text/pseudo-code design write-up), a single demo learner, and no
admin tooling — see the Design Note for the full scope boundary and why each
exclusion was made.
