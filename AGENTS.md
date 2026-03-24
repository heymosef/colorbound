# Colorbound — Codex Rules

## Security: Never Commit Secrets

- NEVER commit `.env`, `.env.production`, `.env.local`, or any `.env.*` file containing real credentials.
- NEVER hardcode API keys, tokens, or secrets in source code.
- ALL environment variables for builds and deploys must be injected via GitHub Actions secrets, not stored in files tracked by git.
- When adding new third-party integrations, add the required env var names to `.env.example` with empty/placeholder values, and add the actual secrets to GitHub Actions secrets only.
- If you see a `.env.*` file being committed, stop and flag it immediately.

## Environment Variable Pattern

| Context | Method |
|---|---|
| Local development | `.env` file (gitignored) |
| Production builds | GitHub Actions secrets → `env:` block in `deploy.yml` |
| Template / documentation | `.env.example` (committed, empty values only) |

When adding a new secret:
1. Add the variable name (empty value) to `.env.example`
2. Add the real value to your local `.env`
3. Add the real value as a GitHub Actions secret (Settings → Secrets → Actions)
4. Add the variable to the `env:` block of the `Build` step in `.github/workflows/deploy.yml`
