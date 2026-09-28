# 内置 Oh My Pi 集成提案

Status: proposed
Translation: current

[English](2026-09-27-builtin-omp.md)

## 摘要

Lody 公开仓库目前还没有内置 Oh My Pi Provider，但已有一个开放的功能请求，建议围绕 OMP RPC 构建 ACP 适配器。推荐方向是新增独立、Apache-2.0 许可的 adapter，通过 `omp --mode rpc` 启动，并由 Lody 作为固定托管运行时集成；OMP 可执行文件和凭据仍留在用户机器上。这仍只是提案：adapter 仓库的所有者和发布路径尚未确认，Core 的 `stdioMcp` 能力也仍待维护者评审。

## 发现

- 本次检查前，用户提供的 Lody checkout 位于 `main` 的 `bc8d8f4f`，工作区干净。该树中不存在 `specs/builtin-omp.md` 或 OMP 提案 Note，尽管 issue #930 提到了这些路径。
- Lody issue [#930](https://github.com/LodyAI/Lody/issues/930) 仍为 open，没有 assignee、评论或匹配的 pull request。它要求独立 `acp-extension-omp` adapter 和真实协议验证门槛，并要求编码前确认 adapter 所有者/仓库、submodule 策略和维护者指派。
- ACP Extension Core issue [#12](https://github.com/LodyAI/acp-extension-core/issues/12) 仍为 open，没有 assignee 或评论。它提议增加 provider-neutral `SessionUsageUpdate.accountingId` 和 `stdioMcp`。当前 Core 已有不可复用的 `_meta.lody.usageScopeId`，且 Lody 会将其映射成 accounting identity（`packages/acp-extension-core/src/usage.ts`、`apps/cli/src/agent/lody-acp-extension.ts`）；对于重启后新建 scope，单独新增 `accountingId` 看起来重复。Core 尚未定义 `stdioMcp`；若 V1 要发送 stdio MCP server，该能力才是真正的上游前置条件。
- 本机 OMP 18.3.1 提供 `--mode rpc` 和独立的 `acp` 命令。#930 明确选择 RPC，并反对把原生命令当成等价接口。本次调查没有实际调用 OMP RPC 协议。
- Lody 的 Pi 先例位于隔离的 ACP adapter submodule，并通过带校验和的托管产物启动（`packages/acp-extension-pi/README.md`、`AGENTS.md`、`apps/cli/src/agent/setting.ts`、`managed-agent-runtime.ts`）。这支持推荐的边界，但不等于获准创建新的上游仓库。
- Lody 托管运行时采用“先产物、后 manifest”（`.agents/notes/implemented/process/2026-09-17-managed-runtime-refresh.md`、`scripts/package-pi-runtime.mjs`）。先通过 `LODY_RUNTIME_BASE_URL` 指向临时产物镜像，并使用临时 manifest 端到端验证真实刷新/安装路径；之后才由 Lody 运行时负责人发布不可变对象并按 SHA-256/字节数核验公开读回；通过该门槛后才能更新受版本控制的 CLI manifest。本贡献不会写入生产产物桶。
- `pnpm run docs status` 已完成。当前 shell 使用 Node `v20.19.6`，低于 Lody 声明的引擎范围 `>=22.14.0 <23 || >=23.6.0`；checkout 未安装根依赖。

## 建议

保持行为 Spec 为 draft，并明确保留未解决边界。若维护者批准该路线，再创建独立 Apache-2.0 adapter，并通过现有固定运行时架构集成。没有证据证明存在缺口前，不要重复添加用量 identity 契约、声明未经验证的能力或打包用户 OMP 可执行文件。若可发布实现要发送已配置的 stdio MCP server，必须先解决 adapter 的所有者/仓库和 `stdioMcp` 契约。

## 验证限制

当前仍处于调研/计划阶段：尚未创建产品代码、ACP 进程、测试套件、构建产物、运行时包或 pull request。已在 [Lody issue #930](https://github.com/LodyAI/Lody/issues/930#issuecomment-5852097107) 和 [ACP Core issue #12](https://github.com/LodyAI/acp-extension-core/issues/12#issuecomment-5852099277) 发布澄清问题，等待维护者决定。此前会话中的 GitHub SSH/HTTPS 克隆曾失败；之后由用户提供了成功 checkout。由于当前 Node 低于声明引擎且未安装根依赖，尚未运行本地构建/测试。
