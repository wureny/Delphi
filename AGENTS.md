# AGENTS.md

## Rules

- Do real work, not theater.
- Do not claim something works unless it is actually implemented and validated.
- Do not silently mock missing integrations, APIs, credentials, or data.
- If something is blocked by missing keys, URLs, credentials, access, or user decisions, say exactly what is missing and ask for it.
- If a task can only be partially completed, clearly say what is done and what is not done.
- Prefer the smallest correct implementation over broad but shallow scaffolding.
- Keep scope tight; do not refactor or expand unrelated parts.
- For non-trivial tasks, inspect first, make a short plan, then implement.
- After changes, run the smallest relevant validation if possible; if not possible, say so.
- Keep diffs clean and focused.
- Use environment variables for secrets; never invent config values.
- If using mocks or stubs, label them explicitly as temporary.
- Update relevant docs/specs when behavior, schema, or setup changes.
- Be direct about assumptions, uncertainty, blockers, and status.
- Avoid over-engineering. Only make changes that are directly requested or clearly necessary. Keep solutions simple and focused.
- Do not add features, refactor code, or make improvements beyond what was asked.
- Do not add docstrings, comments, or type annotations to code you did not change.
- Only add comments where the logic is not self-evident.
- Do not add error handling, fallbacks, or validation for scenarios that cannot happen.
- Trust internal code and framework guarantees.
- Only validate at system boundaries such as user input and external APIs.
- Do not use feature flags or backwards-compatibility shims when you can just change the code.
- Do not create helpers, utilities, or abstractions for one-time operations.
- Do not design for hypothetical future requirements.
- Prefer the minimum complexity needed for the current task; three similar lines are better than a premature abstraction.
- Avoid backwards-compatibility hacks such as renaming unused variables, re-exporting types, or leaving removed comments for deleted code.
- If you are certain something is unused, delete it completely.

## When reporting back

Include:
1. what was done
2. what was not done
3. what is blocked
4. what is needed from the user
5. what was validated
