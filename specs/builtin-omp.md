# Built-in Oh My Pi provider

Status: draft
Translation: current

[中文](builtin-omp.zh.md)

When a user has installed and configured Oh My Pi (OMP) on a machine, they can select OMP as a builtin Lody provider and start an agent session without changing OMP's provider configuration. Lody owns the conversation and ACP boundary; OMP owns model execution and its existing local authentication.

## Proposed runtime boundary

A standalone, Apache-2.0 ACP adapter owns OMP's RPC process and translates it to ACP. The adapter uses `omp --mode rpc`; it does not launch `omp acp`, whose native ACP surface does not establish the Lody-specific contracts required here. Lody distributes only a pinned, checksummed adapter runtime. OMP remains user-installed and is never bundled by Lody.

Lody offers the builtin only on a target machine where the adapter can run and a compatible OMP executable can be resolved. The adapter uses OMP's configured providers and credentials on that machine. Credentials must not enter adapter arguments, Lody history, or diagnostics.

## V1 behavior

The adapter supports ACP session creation, prompts, cancellation, exact native session resume/load, and ordered terminal outcomes. A missing or invalid native session fails; it must not silently resume an unrelated or empty session. Cancellation and transport failure must not be reported as successful completion.

The adapter reports per-model token usage and cost only when OMP supplies reliable values. Usage remains monotonic across an adapter restart: restore the same accounting identity only when its counters are restored; otherwise begin a new accounting scope. Missing cost means unknown, not zero.

Acknowledged steering, user interactions, and lifecycle events use provider-neutral ACP Extension Core contracts. The adapter advertises optional capabilities only after behavior is covered by contract tests. The current adapter rejects configured MCP servers, and Lody withholds stdio MCP configuration for builtin OMP sessions until support is implemented against an approved contract.

## Failure and security boundaries

OMP remains the execution authority. The adapter must preserve request ordering, wait for native cleanup before admitting replacement work, and end the ACP process unsuccessfully when the underlying RPC transport fails. It must not emulate unsupported controls with prompt text, private files, or success-shaped fallbacks. Test data and fixtures are synthetic; no captured user sessions are committed.

## Release and open questions

The related [Lody request #930](https://github.com/LodyAI/Lody/issues/930) proposes the `acp-extension-omp` repository and a separate adapter. That repository did not exist when this draft was prepared. Maintainers must confirm the adapter owner and canonical repository URL, whether the adapter follows the isolated submodule/managed-artifact path used by Pi, and the contribution assignment if the resulting community change exceeds 1,000 lines.

Managed-runtime delivery is artifact-first: build a reproducible adapter archive, then exercise the real runtime refresh/install path end to end against a temporary artifact mirror using `LODY_RUNTIME_BASE_URL` and a throwaway manifest. Only after that local proof, the Lody runtime owner publishes the immutable object to the public channel and verifies its fetched bytes against the generated SHA-256 and size. Change the tracked CLI manifest only after that public read-back. A source merge alone does not make the provider runnable; this contribution does not write to the production bucket.

The related [ACP Core request #12](https://github.com/LodyAI/acp-extension-core/issues/12) proposes `SessionUsageUpdate.accountingId` and a `stdioMcp` capability. The checked-out Core already defines never-reused `_meta.lody.usageScopeId`, and Lody maps it to a consumer accounting identity; an additional `accountingId` appears redundant for restart-safe scopes unless review identifies a distinct missing semantic. `stdioMcp` is absent and remains unapproved. This Spec does not treat either proposal as a released contract.

The compatible OMP version floor and supported operating systems remain to be established by the real-contract job. The installed OMP 18.3.1 and the 18.2.8 baseline named in #930 are evidence candidates, not a compatibility guarantee.

## Evidence

- [Lody issue #930](https://github.com/LodyAI/Lody/issues/930)
- [ACP Extension Core issue #12](https://github.com/LodyAI/acp-extension-core/issues/12)
- `packages/acp-extension-pi/README.md` and `AGENTS.md` (isolated adapter and managed-runtime precedent)
- `apps/cli/src/agent/setting.ts` and `managed-agent-runtime.ts` (builtin launch and pinned runtime owners)
