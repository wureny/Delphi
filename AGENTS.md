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

## When reporting back

Include:
1. what was done
2. what was not done
3. what is blocked
4. what is needed from the user
5. what was validated