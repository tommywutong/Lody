# Proposed built-in Oh My Pi integration

Status: proposed
Translation: current

[中文](2026-09-27-builtin-omp.zh.md)

## Abstract

Lody's public repository does not yet contain a builtin Oh My Pi provider, while an open feature request already proposes an ACP adapter around OMP RPC. The recommended direction is a standalone, Apache-2.0 adapter launched through `omp --mode rpc`, integrated by Lody as a pinned managed runtime while leaving the OMP executable and credentials on the user's machine. This remains a proposal: the adapter repository owner and release route are unconfirmed, and the proposed `stdioMcp` Core capability is awaiting maintainer review.

## Findings

- The checked-out Lody tree was clean on `main` at `bc8d8f4f` before this note and contains no `specs/builtin-omp.md` or OMP proposal note, despite those paths being named in issue #930.
- Lody issue [#930](https://github.com/LodyAI/Lody/issues/930) is open with no assignee, comments, or matching pull request. It requests a standalone `acp-extension-omp` adapter, a real-contract gate, and confirmation of its owner/repository, submodule policy, and maintainer assignment before coding.
- ACP Extension Core issue [#12](https://github.com/LodyAI/acp-extension-core/issues/12) is open with no assignee or comments. It proposes provider-neutral `SessionUsageUpdate.accountingId` and `stdioMcp`. The checked-out Core already has never-reused `_meta.lody.usageScopeId`, which Lody maps to an accounting identity (`packages/acp-extension-core/src/usage.ts`, `apps/cli/src/agent/lody-acp-extension.ts`); a separate `accountingId` appears redundant for restart-safe scopes. Core does not define `stdioMcp`, so that capability remains a genuine upstream prerequisite if V1 sends stdio MCP servers.
- Local OMP 18.3.1 exposes `--mode rpc` and a separate `acp` command. Issue #930 explicitly selects RPC and rejects treating the native ACP command as equivalent. No OMP RPC protocol call was exercised during this investigation.
- Lody's Pi precedent lives in an isolated ACP adapter submodule and is launched from a checksummed managed artifact (`packages/acp-extension-pi/README.md`, `AGENTS.md`, `apps/cli/src/agent/setting.ts`, `managed-agent-runtime.ts`). This supports the recommended boundary but does not authorize a new upstream repository.
- Lody's managed runtime workflow is artifact-first (`.agents/notes/implemented/process/2026-09-17-managed-runtime-refresh.md`, `scripts/package-pi-runtime.mjs`). First prove the real refresh/install path end to end through a temporary artifact mirror via `LODY_RUNTIME_BASE_URL` and a throwaway manifest. Only then does the Lody runtime owner publish the immutable object and verify the public read-back SHA-256/size; update the tracked CLI manifest after that gate. This contribution does not write to the production artifact bucket.
- `pnpm run docs status` completed. The shell uses Node `v20.19.6`, below Lody's declared engine `>=22.14.0 <23 || >=23.6.0`; no root dependencies are installed in this checkout.

## Recommendation

Keep the behavioral Spec in draft and its unresolved boundaries explicit. If maintainers approve the route, create a standalone Apache-2.0 adapter and integrate it through the existing pinned-runtime architecture. Do not add a duplicate usage identity contract without proving a gap, advertise unverified capabilities, or package the user's OMP executable. The adapter owner/repository and the `stdioMcp` contract must be resolved before a releaseable implementation that sends configured stdio MCP servers.

## Verification limits

This work remains at the research/plan stage: no product code, ACP process, test suite, build, runtime package, or pull request has been created. Clarification questions are now posted to [Lody issue #930](https://github.com/LodyAI/Lody/issues/930#issuecomment-5852097107) and [ACP Core issue #12](https://github.com/LodyAI/acp-extension-core/issues/12#issuecomment-5852099277); maintainer decisions are pending. GitHub SSH/HTTPS cloning had failed earlier in the session; the user subsequently supplied a successful checkout. Local build/tests have not run because the shell's Node version is below the declared engine and root dependencies are absent.
