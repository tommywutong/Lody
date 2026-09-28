# OMP ACP adapter — local candidate

A provisional ACP adapter that spawns the execution machine's `omp --mode rpc` process. It does not bundle OMP or read/write OMP credentials.

```text
Lody → ACP adapter → user-installed omp --mode rpc
```

## V1 scope

- ACP new/resume/load with exact OMP native session identity.
- Text prompts, cancellation after OMP terminal acknowledgement, text stream updates, and terminal error propagation.
- Per-assistant-message Core usage accounting. Repeated message ids are merged; unavailable cost remains unknown.

Configured MCP servers, images, steering, interactions, titles, and model configuration are deliberately unsupported. The adapter rejects configured MCP servers rather than silently dropping them.

## Validation

```sh
pnpm check
pnpm build
```

Tests use synthetic RPC frames. `pnpm smoke` starts the installed OMP binary with a temporary home and profile, writes a keyless custom model pointing at a closed loopback endpoint, and verifies ACP initialize/new/load without sending a prompt or inheriting provider credentials. A real prompt contract check requires a separate disposable local model endpoint; it must not use the user's primary OMP profile or a paid endpoint.
