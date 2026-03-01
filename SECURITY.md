# Security Policy

## Supported Versions

| Version | Supported     |
|---------|---------------|
| 0.x.x   | Yes (current) |

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

If you discover a security vulnerability in CodeNautic, please report it responsibly:

1. **GitHub:** Use [GitHub Security Advisories](https://github.com/samiyev/codenautic/security/advisories/new) to report
   privately
2. **Fallback (if GitHub Security Advisories is unavailable):** contact maintainers via private contact channels (for
   example, direct email listed on maintainer GitHub profiles)
3. **Include:**
    - Description of the vulnerability
    - Steps to reproduce
    - Potential impact
    - Suggested fix (if any)

### What to Expect

- **Acknowledgment** within 48 hours
- **Initial assessment** within 5 business days
- **Resolution timeline** communicated after assessment
- **Credit** in the security advisory (unless you prefer to remain anonymous)

### Scope

The following are considered security vulnerabilities:

- Authentication/authorization bypasses
- Injection attacks (SQL, NoSQL, command injection)
- Cross-site scripting (XSS) in the web dashboard
- Exposure of secrets, API keys, or tokens
- Insecure data handling or storage
- Privilege escalation

The following are **not** in scope:

- Denial of service (DoS) attacks
- Social engineering
- Issues in third-party dependencies (report to the upstream project)
- Issues requiring physical access to the server

## Security Best Practices for Contributors

- Never commit secrets, API keys, or credentials
- Use environment variables for all sensitive configuration
- Follow the principle of least privilege in code
- Validate all external input at system boundaries
- Use `Result<T, E>` pattern for error handling (no silent failures)

## Disclosure Policy

We follow a coordinated disclosure process. We ask that you:

- Give us reasonable time to address the issue before public disclosure
- Act in good faith to avoid privacy violations, data destruction, or service disruption
- Do not access or modify data belonging to other users

Thank you for helping keep CodeNautic and its users safe.
