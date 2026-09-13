# Security Policy

## Supported Versions

We provide security updates for the latest stable release and the `main` branch.

| Version        | Supported |
| -------------- | --------- |
| `main`         | Yes       |
| Latest release | Yes       |
| Older releases | No        |

## Reporting a Vulnerability

Please report security vulnerabilities privately.

- Preferred: GitHub Security Advisories (Security tab → “Report a vulnerability”).
- If GitHub reporting is unavailable: email the maintainers.

We aim to acknowledge reports within 2 business days and provide status updates at least weekly until resolution.

## Credential handling

- Never commit passwords, privileged account identifiers, private keys,
  production tokens, database connection strings, or signing-secret values.
- Keep production secrets in the hosting provider's encrypted environment or
  the approved secret manager. Repository examples must use obvious
  placeholders or synthetic values.
- Treat a committed credential as compromised. Rotate or revoke it, invalidate
  affected sessions, remove it from active branch tips, and assess Git history
  exposure as separate incident-response steps.
- Coordinate rotations and history-rewrite decisions through a private
  security advisory. Do not post replacement values in issues or pull requests.
