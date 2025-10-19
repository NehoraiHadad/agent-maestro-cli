# Example: Security Audit

## User Request
"Review our authentication system for security vulnerabilities and suggest improvements"

## Task Analysis
```typescript
{
  complexity: 'high',
  requiresWeb: false,
  requiresSpeed: false,
  requiresContext: true,
  securityCritical: true,
  costSensitive: false,
  canParallelize: false,
  hasDependencies: false
}
```

## Decision Process

### Why Claude?
- **Security expertise:** 92/100 capability score
- **Performance advantage:** 44% faster, 25% more accurate on security tasks
- **Context requirements:** Needs deep understanding of codebase (1M token window)
- **Confidence:** 0.95

### Why not Codex?
- Security is not Codex's primary strength (60/100)
- Quick fixes ≠ thorough security analysis

### Why not Gemini?
- Doesn't require web research
- Security audits need deep technical analysis, not content generation

## Delegation Output

```
I'll delegate this security analysis to Claude, who specializes in security audits:

[[DELEGATE:claude]]
Perform a comprehensive security audit of our authentication system:

1. **Code Review:**
   - Analyze authentication flow in src/auth/
   - Review session management in src/middleware/session.ts
   - Check password hashing implementation
   - Examine token generation and validation

2. **Common Vulnerabilities:**
   - SQL injection risks
   - XSS vulnerabilities
   - CSRF protection
   - Session fixation issues
   - Timing attacks on password comparison

3. **Best Practices Check:**
   - Password strength requirements
   - Account lockout mechanisms
   - Rate limiting on auth endpoints
   - Secure cookie configuration
   - HTTPS enforcement

4. **Deliverables:**
   - List of vulnerabilities with severity levels (Critical/High/Medium/Low)
   - Specific code locations for each issue
   - Detailed recommendations with code examples
   - Priority order for fixes
[[/DELEGATE]]
```

## Expected Result

Claude will provide:
- Detailed security report with prioritized vulnerabilities
- Specific file locations and line numbers
- Code examples showing both vulnerable and fixed versions
- Compliance recommendations (OWASP, NIST, etc.)

## Follow-up Actions

After receiving the audit results:
1. Review findings with team
2. Prioritize fixes based on severity
3. Optionally delegate implementation to Codex:
   ```
   [[DELEGATE:codex]]
   Implement the high-priority security fixes identified in the audit:
   [paste specific recommendations]
   [[/DELEGATE]]
   ```
