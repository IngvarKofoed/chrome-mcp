import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";
import type { WebSocketRequest, WebSocketResponse } from "./types.js";

const COMMAND_TIMEOUT_MS = 30_000;

export class WebSocketBridge {
  private wss: WebSocketServer | null = null;
  private client: WebSocket | null = null;
  private pendingRequests = new Map<
    string,
    {
      resolve: (data: unknown) => void;
      reject: (err: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  private port: number;

  constructor(port: number = 7865) {
    this.port = port;
  }

  get isConnected(): boolean {
    return this.client !== null && this.client.readyState === WebSocket.OPEN;
  }

  start(): void {
    this.wss = new WebSocketServer({ port: this.port });

    this.wss.on("connection", (ws) => {
      if (this.client) {
        console.error("[bridge] Replacing existing extension connection");
        this.client.close();
      }
      this.client = ws;
      console.error("[bridge] Extension connected");

      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString()) as WebSocketResponse;
          this.handleResponse(msg);
        } catch (err) {
          console.error("[bridge] Failed to parse message:", err);
        }
      });

      ws.on("close", () => {
        if (this.client === ws) {
          this.client = null;
          console.error("[bridge] Extension disconnected");
        }
      });

      ws.on("error", (err) => {
        console.error("[bridge] WebSocket error:", err.message);
      });
    });

    console.error(`[bridge] WebSocket server listening on port ${this.port}`);
  }

  async sendCommand(
    command: string,
    params: Record<string, unknown> = {}
  ): Promise<unknown> {
    if (!this.isConnected) {
      throw new Error(
        "Chrome extension is not connected. Make sure the extension is installed and Chrome is running."
      );
    }

    const id = uuidv4();
    const request: WebSocketRequest = { id, command, params };

    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(
          new Error(`Command '${command}' timed out after ${COMMAND_TIMEOUT_MS}ms`)
        );
      }, COMMAND_TIMEOUT_MS);

      this.pendingRequests.set(id, { resolve, reject, timer });
      this.client!.send(JSON.stringify(request));
    });
  }

  private handleResponse(msg: WebSocketResponse): void {
    const pending = this.pendingRequests.get(msg.id);
    if (!pending) {
      if (msg.id !== "ping") {
        console.error(`[bridge] Received response for unknown request: ${msg.id}`);
      }
      return;
    }

    clearTimeout(pending.timer);
    this.pendingRequests.delete(msg.id);

    if (msg.success) {
      pending.resolve(msg.data);
    } else {
      pending.reject(new Error(msg.error ?? "Unknown error from extension"));
    }
  }

  stop(): void {
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Bridge shutting down"));
      this.pendingRequests.delete(id);
    }

    if (this.client) {
      this.client.close();
      this.client = null;
    }

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    console.error("[bridge] Stopped");
  }
}
