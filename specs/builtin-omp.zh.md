# 内置 Oh My Pi Provider

Status: draft
Translation: current

[English](builtin-omp.md)

当用户已在某台机器安装并配置 Oh My Pi（OMP）时，可以在 Lody 中选择内置 OMP Provider 并启动 Agent 会话，无需改写 OMP 的 Provider 配置。Lody 拥有对话和 ACP 边界；OMP 继续负责模型执行及其现有本地认证。

## 建议的运行时边界

新增独立、Apache-2.0 许可的 ACP 适配器，由适配器拥有 OMP RPC 子进程并将其转换为 ACP。适配器使用 `omp --mode rpc`，不启动 `omp acp`；后者的原生 ACP 接口尚不能证明满足这里要求的 Lody 专属协议契约。Lody 只分发固定且带校验和的适配器运行时。OMP 仍由用户安装，Lody 不打包 OMP 本体。

只有目标机器能够运行适配器并找到兼容 OMP 可执行文件时，Lody 才提供内置 Provider。适配器在该机器上使用 OMP 已配置的 Provider 和凭据。凭据不得进入适配器参数、Lody 历史或诊断日志。

## V1 行为

适配器支持 ACP 会话创建、prompt、取消、精确的原生会话 resume/load，以及有序的终止结果。原生会话不存在或无效时必须失败，不能静默恢复成其他会话或空会话。取消和传输失败不能伪报成功完成。

仅在 OMP 提供可靠值时，适配器才报告按模型划分的 token 用量和成本。适配器重启后用量仍保持单调：只有在计数器已恢复时才延续相同 accounting identity；否则开启新的 accounting scope。缺失成本表示未知，不表示免费。

已确认的 steering、用户交互和生命周期事件使用 Provider-neutral ACP Extension Core 契约转换。只有行为有契约测试覆盖时，适配器才声明可选能力。当前 adapter 会拒绝已配置的 MCP server；在通过获批契约实现支持前，Lody 不会向内置 OMP 会话发送 stdio MCP 配置。

## 故障与安全边界

OMP 保持执行权限的所有者。适配器必须保留请求顺序，在清理完原生工作后才能接受替代工作；底层 RPC 传输失败时，ACP 进程必须以失败状态结束。不得用 prompt 文本、私有文件或伪装成功的回退来模拟不受支持的控制。测试数据和 fixture 必须合成生成，不提交用户会话记录。

## 发布与未决问题

相关的 [Lody issue #930](https://github.com/LodyAI/Lody/issues/930) 提议建立 `acp-extension-omp` 仓库并单独维护 adapter。撰写本草案时，该仓库尚不存在。维护者需确认 adapter 的所有者和规范仓库 URL、是否采用与 Pi 相同的隔离 submodule/托管运行时产物流程，以及当社区改动超过 1,000 行时所需的 issue 指派。

托管运行时按“先产物、后 manifest”发布：先构建可复现的 adapter 归档，再通过 `LODY_RUNTIME_BASE_URL` 指向临时产物镜像，并使用仓库外的临时 manifest，端到端验证真实运行时刷新/安装路径。只有本地验证通过后，才由 Lody 运行时负责人将不可变对象发布到公开通道，并按生成的 SHA-256 与字节数读回核验。公开读回验证通过后才能修改受版本控制的 CLI manifest。只合并源码并不能让 Provider 真正可运行；本贡献不会写入生产产物桶。

相关的 [ACP Core issue #12](https://github.com/LodyAI/acp-extension-core/issues/12) 提议增加 `SessionUsageUpdate.accountingId` 和 `stdioMcp` 能力。当前 Core 已定义不可复用的 `_meta.lody.usageScopeId`，Lody 也会将其映射为 consumer accounting identity；对于重启后开启新 scope，额外的 `accountingId` 看起来重复，除非维护者评审能指出不同且缺失的语义。Core 目前没有 `stdioMcp`，该能力仍未获批准。本 Spec 不把任一提案视为已发布契约。

兼容 OMP 的最低版本和支持操作系统仍需由真实契约测试确定。已安装的 OMP 18.3.1 与 #930 提到的 18.2.8 基线只是候选验证版本，不构成兼容性保证。

## 依据

- [Lody issue #930](https://github.com/LodyAI/Lody/issues/930)
- [ACP Extension Core issue #12](https://github.com/LodyAI/acp-extension-core/issues/12)
- `packages/acp-extension-pi/README.md` 与 `AGENTS.md`（隔离 adapter 和托管运行时先例）
- `apps/cli/src/agent/setting.ts` 与 `managed-agent-runtime.ts`（builtin 启动和固定运行时的代码所有者）
