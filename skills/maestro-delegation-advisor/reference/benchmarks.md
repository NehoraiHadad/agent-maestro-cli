# Agent Performance Benchmarks

Quick reference for agent capabilities and performance metrics.

## Benchmark Scores

### Claude (Anthropic)
- **SWE-bench Verified:** 72.7%
- **Context Window:** 1,000,000 tokens (750K words)
- **Speed:** Medium (slower than Codex, faster than research)
- **Cost:** Higher (premium quality)
- **Security Tasks:** 44% faster, 25% more accurate vs competitors

### Codex (OpenAI)
- **HumanEval:** 90.2%
- **SWE-bench:** 69.1%
- **Context Window:** ~128K tokens
- **Speed:** Fastest
- **Cost:** Medium

### Gemini (Google)
- **Context Window:** 2,000,000 tokens (largest available)
- **Speed:** Medium
- **Cost:** Most affordable
- **Specialization:** Web search, automation, content generation

## Capability Matrix

| Capability | Claude | Codex | Gemini |
|------------|--------|-------|--------|
| Architecture | 95 | 60 | 65 |
| Code Generation | 75 | 95 | 70 |
| Refactoring | 90 | 65 | 70 |
| Security | 92 | 60 | 55 |
| Speed | 60 | 95 | 70 |
| Web Research | 50 | 45 | 95 |
| Automation | 60 | 70 | 95 |
| Cost Efficiency | 40 | 60 | 95 |

## When to Use Each Agent

### Use Claude when:
- Task complexity is HIGH
- Security is critical
- Deep codebase analysis needed
- Architecture decisions required
- Budget allows for quality

### Use Codex when:
- Speed is important
- Code generation is primary task
- Task complexity is LOW-MEDIUM
- Implementing from clear specifications
- Bug fixes needed quickly

### Use Gemini when:
- Web research required
- Browser automation needed
- Workflow automation
- Content generation
- Budget is constrained
- Task requires largest context window

## Sources

- SWE-bench Verified: https://render.com/blog/ai-coding-agents-benchmark
- Claude Capabilities: https://www.anthropic.com/engineering/claude-code-best-practices
- Codex Performance: https://openai.com/index/introducing-codex/
- Comparison: https://www.codeant.ai/blogs/claude-code-cli-vs-codex-cli-vs-gemini-cli
