import { afterEach, describe, expect, it } from "vitest";
import type * as acp from "@agentclientprotocol/sdk";
import type { SessionUsageUpdate } from "acp-extension-core";
import { OmpRpcConnection } from "../src/connection.js";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

type Peer = {
  connection: OmpRpcConnection;
  emit(frame: Record<string, unknown>): void;
  state: {
    sessionFile: string;
    sessionId: string;
    thinkingLevel: string;
    model: { provider: string; id: string; name: string };
  };
  received: Record<string, unknown>[];
  updates: acp.SessionNotification[];
  usages: SessionUsageUpdate[];
  setPrompt(handler: (command: Record<string, unknown>) => void): void;
  setAbort(handler: (command: Record<string, unknown>) => void): void;
  close(): void;
  exited: Promise<void>;
};

function peer(): Peer {
  let output!: ReadableStreamDefaultController<Uint8Array>;
  let closed = false;
  const received: Record<string, unknown>[] = [];
  const exited = deferred<void>();
  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      output = controller;
    },
  });
  const state = {
    sessionFile: "/tmp/omp-session.jsonl",
    sessionId: "native-omp-session",
    thinkingLevel: "high",
    model: { provider: "fixture", id: "model", name: "Fixture" },
  };
  const emit = (frame: Record<string, unknown>) =>
    output.enqueue(new TextEncoder().encode(`${JSON.stringify(frame)}\n`));
  const reply = (command: Record<string, unknown>, data: unknown = {}) =>
    emit({ type: "response", id: command.id, command: command.type, success: true, data });
  let onPrompt = (command: Record<string, unknown>) => {
    reply(command, {});
    emit({ type: "message_update", messageId: "assistant-1", message: { role: "assistant" }, assistantMessageEvent: { type: "text_delta", delta: "hello" } });
    emit({ type: "prompt_result", id: command.id, agentInvoked: true, status: "completed", sessionSettled: true });
  };
  let onAbort = (command: Record<string, unknown>) => {
    reply(command, {});
    const prompt = [...received].reverse().find((candidate) => candidate.type === "prompt");
    if (!prompt) throw new Error("Abort has no active prompt");
    emit({ type: "prompt_result", id: prompt.id, agentInvoked: true, status: "aborted", sessionSettled: true });
  };
  const writable = new WritableStream<Uint8Array>({
    write(bytes) {
      const command = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
      received.push(command);
      switch (command.type) {
        case "get_state":
          reply(command, state);
          break;
        case "new_session":
          reply(command, { cancelled: false });
          break;
        case "switch_session":
          reply(command, { cancelled: false });
          break;
        case "prompt":
          onPrompt(command);
          break;
        case "abort":
          onAbort(command);
          break;
        default:
          throw new Error(`Unexpected command: ${String(command.type)}`);
      }
    },
  });
  const updates: acp.SessionNotification[] = [];
  const usages: SessionUsageUpdate[] = [];
  const host = {
    update: async (notification: acp.SessionNotification) => updates.push(notification),
    usage: (usage: SessionUsageUpdate) => usages.push(usage),
  };
  return {
    connection: new OmpRpcConnection({ readable, writable }, host),
    emit,
    state,
    received,
    updates,
    usages,
    setPrompt(handler: (command: Record<string, unknown>) => void) {
      onPrompt = handler;
    },
    close() {
      if (closed) return;
      closed = true;
      output.close();
      exited.resolve();
    },
    exited: exited.promise,
  };
}

describe("OMP RPC connection", () => {
  const peers: Peer[] = [];
  afterEach(() => {
    for (const value of peers.splice(0)) value.close();
  });

  it("streams a completed OMP prompt as ACP text and end_turn", async () => {
    const p = peer();
    peers.push(p);
    const session = await p.connection.newSession({ cwd: "/work", mcpServers: [] });
    await expect(
      p.connection.prompt({ sessionId: session.sessionId, prompt: [{ type: "text", text: "hello" }] })
    ).resolves.toEqual({ stopReason: "end_turn" });
    expect(p.updates).toContainEqual({
      sessionId: session.sessionId,
      update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "hello" } },
    });
  });

  it("accounts each OMP message id once without inventing a missing cost", async () => {
    const p = peer();
    peers.push(p);
    p.setPrompt((command) => {
      p.emit({ type: "response", id: command.id, command: command.type, success: true, data: {} });
      const message = {
        role: "assistant",
        provider: "fixture",
        model: "model",
        usage: { input: 10, output: 5, cacheRead: 2, cacheWrite: 1, totalTokens: 18 },
      };
      p.emit({ type: "message_end", messageId: "operation-1", message });
      p.emit({ type: "message_end", messageId: "operation-1", message });
      p.emit({ type: "prompt_result", id: command.id, agentInvoked: true, status: "completed", sessionSettled: true });
    });
    const session = await p.connection.newSession({ cwd: "/work", mcpServers: [] });
    await p.connection.prompt({ sessionId: session.sessionId, prompt: [{ type: "text", text: "usage" }] });
    expect(p.usages).toHaveLength(1);
    const usage = p.usages[0];
    expect(usage?.modelUsage).toMatchObject({
      "fixture/model": { inputTokens: 10, outputTokens: 5, cacheReadInputTokens: 2, cacheCreationInputTokens: 1 },
    });
    expect(usage?.modelUsage?.["fixture/model"]?.costUSD).toBeUndefined();
  });

  it("waits for OMP's terminal abort before completing cancellation", async () => {
    const p = peer();
    peers.push(p);
    const session = await p.connection.newSession({ cwd: "/work", mcpServers: [] });
    p.setPrompt((command) => {
      p.emit({ type: "response", id: command.id, command: command.type, success: true, data: {} });
    });
    const prompt = p.connection.prompt({
      sessionId: session.sessionId,
      prompt: [{ type: "text", text: "wait" }],
    });
    await p.connection.cancel({ sessionId: session.sessionId });
    await expect(prompt).resolves.toEqual({ stopReason: "cancelled" });
  });

  it("rejects an exact resume when OMP selects another native session", async () => {
    const p = peer();
    peers.push(p);
    p.state.sessionFile = "/tmp/other.jsonl";
    await expect(
      p.connection.resumeSession({ sessionId: "/tmp/expected.jsonl", cwd: "/work", mcpServers: [] })
    ).rejects.toThrow("different session");
  });

  it("fails an active ACP prompt when OMP's RPC stream closes", async () => {
    const p = peer();
    peers.push(p);
    const session = await p.connection.newSession({ cwd: "/work", mcpServers: [] });
    p.setPrompt((command) => {
      p.emit({ type: "response", id: command.id, command: command.type, success: true, data: {} });
    });
    const prompt = p.connection.prompt({
      sessionId: session.sessionId,
      prompt: [{ type: "text", text: "wait" }],
    });
    p.close();
    await expect(prompt).rejects.toThrow("OMP RPC stream closed");
  });
});
