# Colorbound — Claude Code Rules

## Security: Never Commit Secrets

- NEVER commit `.env`, `.env.production`, `.env.local`, or any `.env.*` file containing real credentials.
- NEVER hardcode API keys, tokens, or secrets in source code.
- ALL environment variables for builds and deploys must be injected via Vercel project settings or Supabase secrets — never stored in files tracked by git.
- When adding new third-party integrations, add the required env var names to `.env.example` with empty/placeholder values, and add the actual secrets to Vercel (and Supabase if used by edge functions).
- If you see a `.env.*` file being committed, stop and flag it immediately.

## Environment Variable Pattern

| Context | Method |
|---|---|
| Local development | `.env` file (gitignored) |
| Production builds (frontend) | Vercel project settings → Environment Variables |
| Supabase edge functions | Supabase project settings → Edge Function Secrets |
| Template / documentation | `.env.example` (committed, empty values only) |

When adding a new secret:
1. Add the variable name (empty value) to `.env.example`
2. Add the real value to your local `.env`
3. Add the real value to Vercel (Settings → Environment Variables) for frontend use
4. If needed by a Supabase edge function, add it to Supabase project secrets as well

---

## Implementation Quality Standards

These apply to every task.

### Approach
- Prefer root-cause fixes over surface-level patches.
- If requested behavior conflicts with the current architecture, propose the safest durable implementation — not a temporary workaround.
- Reuse existing components, patterns, and architecture. Do not introduce unnecessary abstractions.

### Scope Control
- Do not remove or alter unrelated functionality.
- Preserve existing behavior unless a change is explicitly required.

### Pre-Implementation
- For tasks touching more than one subsystem, present a plan before writing any code.
- Before writing code, identify dependencies, edge cases, and regression risks.

### Testing & Validation
- Add or update tests for all affected behavior.
- Validate desktop, tablet, and mobile interactions where relevant.

---

## Multi-Agent Execution

When a task spans 3+ independent files or subsystems, or is estimated to take more than 30 minutes sequentially:
- Break work into clear, independent workstreams before starting.
- Assume multiple agents can work in parallel — design handoffs and interfaces explicitly.
- Use `claude-sonnet-4-6` for plan execution unless instructed otherwise.

---

## Identifying New Rules

After completing a task, consider whether any patterns, decisions, or constraints from this session should be captured here. If so, propose additions to this file.
