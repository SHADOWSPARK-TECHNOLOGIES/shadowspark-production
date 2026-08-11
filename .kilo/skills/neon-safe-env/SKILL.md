# neon-safe-env

Move and use sensitive Neon URLs without shell interpretation issues (`&`, `?`, etc.).

## Threat model
Raw URL pastes in shell can be truncated or interpreted as control operators.

## Preferred methods

### Method A: editor-first (recommended)
1. Open `/tmp/dburl.txt` in editor.
2. Paste only one line:
   - `DATABASE_URL=postgresql://...`
3. Save file.
4. Run consumer command that parses file directly.

### Method B: single-quoted heredoc
Use a quoted heredoc delimiter so shell does not interpret symbols.

```bash
cat > /tmp/dburl.txt <<'EOF'
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler...neon.tech/neondb?channel_binding=require&sslmode=require
EOF
```

### Method C: command substitution from file
When a command needs an env var inline, load from file content instead of raw paste.

```bash
DATABASE_URL="$(cat /tmp/dburl.txt | sed -n 's/^DATABASE_URL=//p')" npx tsx prisma/seed.ts
```

## Hard rules
- Never paste raw Neon URLs unquoted into shell commands.
- Always use single quotes around heredoc token: `<<'EOF'`.
- Never commit `.env*` with credentials.
- Mask passwords in logs and reports.

## Quick validation
- Run a hostname probe from application logs.
- Confirm host matches `ep-*.neon.tech`.
- Confirm command exits `0`.
