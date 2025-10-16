# Technical Details for CLI Tools

This document provides a summary of the technical details for the CLI tools for Claude, Gemini, and Codex.

## Claude

*   **Package Name:** `@anthropic-ai/claude-code`
*   **Installation:**
    ```bash
    npm install -g @anthropic-ai/claude-code
    ```
*   **Authentication:** Requires a Claude Pro or Max subscription.
*   **Usage:**
    *   Run `claude` in the terminal to initialize the tool.
    *   Designed for agentic coding tasks like debugging, refactoring, and navigating codebases.

*   **Direct terminal examples:**
    ```bash
    # Discover available commands/flags
    claude --help
    claude --version

    # Prompt-based run (see --help for supported flags)
    claude -p "Explain the architecture of this codebase"

    # Structured/streaming output if supported by your version (see --help)
    claude -p "Summarize key modules" --output-format json
    claude -p "Monitor long-running refactor plan" --output-format stream-json
    ```

## Gemini

*   **Package Name:** `@google/gemini-cli`
*   **Installation:**
    ```bash
    npm install -g @google/gemini-cli
    ```
    or without global installation:
    ```bash
    npx @google/gemini-cli
    ```
*   **Authentication:**
    *   Personal Google account (free, with limits).
    *   Google AI Studio key.
    *   Vertex AI key.
*   **Usage:**
    *   Uses the `gemini` command.
    *   Supports a wide range of tasks including coding assistance, task automation, and content generation.
    *   Has built-in tools like `grep`, `terminal`, `file read`, and `file write`.
    *   Can be extended with custom tools.
    *   Project-specific context can be provided via a `GEMINI.MD` file.

*   **Direct terminal examples:**
    ```bash
    # Discover available commands/flags
    gemini --help
    gemini --version

    # Prompt with structured JSON output
    gemini -p "Explain the architecture of this codebase" --output-format json

    # Real-time streaming events as newline-delimited JSON
    gemini -p "Run tests and deploy" --output-format stream-json

    # Read prompt from a file and write result to a file (if supported)
    gemini -f prompt.txt --output-format json > result.json
    ```

## Codex

*   **Package Name:** `@openai/codex`
*   **Installation:**
    ```bash
    npm install -g @openai/codex
    ```
*   **Authentication:**
    *   Sign in with a ChatGPT account.
    *   Set the `OPENAI_API_KEY` environment variable.
*   **Usage:**
    *   Uses the `codex` command.
    *   Runs locally and can be sandboxed.
    *   Features different autonomy modes:
        *   `suggest` (default): Requires approval for every action.
        *   `auto-edit`: Can read and write files automatically, but asks for permission to execute shell commands.
        *   `full-auto`: Operates autonomously.
    *   Project-specific instructions can be provided via an `AGENTS.MD` file.

*   **Direct terminal examples:**
    ```bash
    # Discover available commands/flags
    codex --help
    codex --version

    # Prompt-based run (see --help for supported flags)
    codex -p "Explain the architecture of this codebase"

    # Structured/streaming output if supported by your version (see --help)
    codex -p "Generate migration plan" --output-format json
    codex -p "Run tests and show progress" --output-format stream-json
    ```
