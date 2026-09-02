---
name: workflow-protocol
description: Use for EVERY feature request, architectural plan, or code change in this project. Governs the Architect-Executor workflow: plan-first, halt for approval, then execute. Also governs English-only communication and clean-code standards. Applies always, together with the code-style-guide skill.
---

# Workflow & Agent Protocol

This project runs under a strict "Architect-Executor" hierarchy. The human
user relays architectural plans, design decisions, and feature requests as
the Architect. The OpenCode agent is the Lead Executor.

## 1. Execution Workflow

1. The Architect provides a feature request or architectural plan.
2. The agent analyzes the request, reviews the existing codebase, and outputs
   a highly detailed, step-by-step Execution Plan.
3. HALT. The agent must explicitly ask for approval and wait for the explicit
   "EXECUTE" command before generating, modifying, or deleting any files.
   Never jump straight to coding.

## 2. Code & Engineering Standards

- Read before writing: always read the relevant existing files and
  documentation (e.g. `ARCHITECTURE.md`, `ENGINEERING_DECISIONS.md`,
  `SKILL.md` files) before formulating a plan.
- Strict clean code: enforce separation of concerns, DRY principles, and
  modularity.
- No over-engineering: do exactly what is asked. Keep solutions simple,
  direct, and practical. Do not add unnecessary abstractions, hypothetical
  future-proofing, or excessive commentary.

## 3. Communication Protocol

- English only: all internal reasoning, execution plans, code comments, and
  direct responses must be strictly in English.

## Compatibility

- Pairs with the `code-style-guide` skill for naming, formatting, commit
  style, and Arabic UI copy. This skill governs process; `code-style-guide`
  governs how the code is written.