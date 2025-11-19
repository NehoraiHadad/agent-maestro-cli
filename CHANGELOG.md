# Changelog

All notable changes to AgentMaestro will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2025-01-17

### Added
- RetryManager for automatic retry logic with exponential backoff
- CircuitBreaker pattern for fault tolerance
- MetricsCollector for performance tracking
- SessionIdExtractor for centralized session ID parsing
- Comprehensive JSDoc documentation for public APIs
- TypeScript tests (migrated from JavaScript)
- Centralized timeout constants (TIMEOUTS)
- Dependency injection support in Maestro class
- Performance metrics export functionality
- ConfigValidationError for better error handling

### Changed
- Session ID generation now uses cryptographically secure `crypto.randomUUID()`
- PTY process termination now performs graceful shutdown (SIGTERM before SIGKILL)
- ConfigManager now enforces validation in constructor
- Improved error messages with troubleshooting information
- All verbose logging now uses LoggingManager instead of console.log
- TypeScript types strengthened with readonly modifiers
- Agent execution options now support dangerousMode configuration

### Fixed
- **SECURITY**: Command injection vulnerability in PTYSpawner.isCommandAvailable()
- **SECURITY**: Non-cryptographic random in session ID generation
- Resource leak in PTY cleanup (missing graceful shutdown)
- Magic numbers scattered throughout codebase
- Duplicate Session ID regex patterns in Maestro
- Inconsistent logging practices
- Version mismatch between CLI and package.json (CLI now reads version dynamically)

### Removed
- Direct console.log usage in production code
- Hardcoded timeout values

## [2.0.0] - 2025-01-XX

### Changed
- Simplified architecture to use Claude Code as primary agent
- Delegation now via Claude Code Skills/Subagents only
- Removed custom delegation protocol

### Added
- Plan Mode support (--plan-mode flag)
- Session continuity with --continue and --resume
- Plugin system integration
- maestro-delegation-suite plugin

## [1.0.0] - 2024-XX-XX

### Added
- Initial release
- Multi-agent orchestration (Claude, Gemini, Codex)
- PTY-based interactive sessions
- Streaming output support
- Interactive REPL
- Logging system
