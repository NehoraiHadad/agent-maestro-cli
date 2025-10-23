# Example: Feature Implementation with Research

## User Request
"Add a payment processing feature to our e-commerce platform with industry best practices"

## Task Analysis
```typescript
{
  complexity: 'high',
  requiresWeb: true,          // Need to research best practices
  requiresSpeed: false,
  requiresContext: true,      // Must understand existing system
  securityCritical: true,     // Payment handling is security-critical
  costSensitive: false,
  canParallelize: false,
  hasDependencies: true       // Research → Design → Implementation
}
```

## Decision Process

### Why Sequential Delegation?
This task has three distinct phases that must happen in order:
1. **Research** best practices (Gemini)
2. **Design** secure architecture (Claude)
3. **Implement** the code (Codex)

### Phase Selection Rationale

**Phase 1 - Gemini for Research:**
- Web research is Gemini's strength (95/100)
- Most cost-effective for gathering information
- Can find recent standards and best practices

**Phase 2 - Claude for Architecture:**
- Security-critical design needs Claude's expertise (92/100)
- Complex system integration requires deep analysis
- 1M token context to understand existing codebase

**Phase 3 - Codex for Implementation:**
- Fast, accurate code generation (90.2% HumanEval)
- Efficient at translating designs into code
- Excellent at creating tests

## Delegation Output

```
I'll break this into three phases for optimal results:

**Phase 1: Research Best Practices** (Gemini)

[[DELEGATE:gemini]]
Research payment processing best practices for e-commerce in 2025:

1. **Payment Gateways:**
   - Compare Stripe, PayPal, Square, Braintree
   - API comparison: ease of use, fees, features
   - PCI compliance requirements for each

2. **Security Standards:**
   - PCI DSS compliance requirements
   - Tokenization best practices
   - Secure payment data handling
   - Common vulnerabilities in payment systems

3. **Implementation Patterns:**
   - Client-side vs server-side processing
   - Webhook handling best practices
   - Idempotency for payment requests
   - Error handling and retry logic
   - Receipt generation and storage

4. **User Experience:**
   - Multi-step checkout flows
   - Payment method management
   - Subscription handling patterns
   - Refund workflows

Provide recommendations with pros/cons for each approach.
[[/DELEGATE]]

---

**Phase 2: Architecture Design** (Claude - after Phase 1 completes)

Once I receive the research, I'll delegate the architectural design:

[[DELEGATE:claude]]
Design a secure payment processing architecture based on research findings:

Context: [Results from Gemini's research will be inserted here]

Requirements:
1. **Database Schema:**
   - Payment transactions table
   - Customer payment methods (tokenized)
   - Subscription management
   - Refund tracking
   - Audit logs

2. **API Design:**
   - Payment initiation endpoint
   - Webhook receiver for payment events
   - Payment status checking
   - Refund processing
   - Payment method management

3. **Security Architecture:**
   - Token-based payment handling (no raw card data)
   - Webhook signature verification
   - Idempotency key implementation
   - Rate limiting strategy
   - Audit logging requirements

4. **Integration Points:**
   - How to integrate with existing user system
   - Order management integration
   - Email notification triggers
   - Admin dashboard requirements

5. **Error Handling:**
   - Payment failure scenarios
   - Network timeout handling
   - Duplicate payment prevention
   - Refund error scenarios

Deliverables:
- Database schema with migrations
- API endpoint specifications
- Security implementation checklist
- Integration architecture diagram
- Error handling strategy
[[/DELEGATE]]

---

**Phase 3: Implementation** (Codex - after Phase 2 completes)

Finally, implement the designed system:

[[DELEGATE:codex]]
Implement the payment processing feature following the architectural design:

Design: [Claude's architecture will be inserted here]

Tasks:
1. **Database:**
   - Create migration files for all payment-related tables
   - Add indexes for performance
   - Set up foreign key relationships

2. **Payment Service:**
   - Implement PaymentService class with methods:
     - createPaymentIntent()
     - capturePayment()
     - refundPayment()
     - getPaymentStatus()
   - Add tokenization handling
   - Implement idempotency

3. **API Endpoints:**
   - POST /api/payments/create
   - POST /api/payments/webhooks
   - GET /api/payments/:id
   - POST /api/payments/:id/refund
   - Add authentication middleware
   - Add rate limiting

4. **Webhook Handler:**
   - Signature verification
   - Event processing
   - Idempotency checking
   - Error handling

5. **Testing:**
   - Unit tests for PaymentService
   - Integration tests for API endpoints
   - Webhook handler tests
   - Mock external payment gateway
   - Edge case testing (timeouts, duplicates, failures)

6. **Documentation:**
   - API endpoint documentation
   - Payment flow diagrams
   - Error code reference
   - Integration guide for frontend

Use TypeScript with proper types and follow existing code patterns in the project.
[[/DELEGATE]]
```

## Expected Timeline

- **Phase 1 (Research):** ~10-15 minutes
  - Gemini searches, aggregates, and summarizes best practices

- **Phase 2 (Design):** ~15-20 minutes
  - Claude analyzes research and existing codebase
  - Produces comprehensive architecture

- **Phase 3 (Implementation):** ~20-30 minutes
  - Codex generates migrations, services, API endpoints, tests
  - Fast code generation with high accuracy

**Total:** ~45-65 minutes for a production-ready payment system

## Benefits of This Approach

### ✅ Optimal Agent Selection
- Each agent handles what they do best
- Higher quality results than using a single agent

### ✅ Knowledge Accumulation
- Research findings inform the design
- Design specifications guide the implementation
- Each phase builds on the previous

### ✅ Security First
- Claude handles security-critical design decisions
- Gemini finds latest security best practices
- Codex implements exactly as designed

### ✅ Cost Effective
- Gemini handles research efficiently
- Claude used only for complex design
- Codex for fast implementation

## Alternative: Parallel Sub-Tasks

If the payment feature has independent components, you could parallelize parts of Phase 3:

```
[[DELEGATE_PARALLEL]]
[[DELEGATE:codex]]
Implement core payment service and database layer
[[/DELEGATE]]

[[DELEGATE:codex]]
Implement webhook handler and event processing
[[/DELEGATE]]

[[DELEGATE:codex]]
Create comprehensive test suite
[[/DELEGATE]]
[[/DELEGATE_PARALLEL]]
```

This reduces implementation time to ~10-15 minutes if tasks are truly independent.

## Follow-up Actions

After implementation:
1. **Code Review** - Delegate to Claude:
   ```
   [[DELEGATE:claude]]
   Review the payment implementation for security issues and best practices
   [[/DELEGATE]]
   ```

2. **Documentation** - Delegate to Gemini:
   ```
   [[DELEGATE:gemini]]
   Generate user-facing documentation for the payment feature
   [[/DELEGATE]]
   ```

3. **Integration Tests** - Delegate to Codex:
   ```
   [[DELEGATE:codex]]
   Add end-to-end integration tests for the complete payment flow
   [[/DELEGATE]]
   ```
