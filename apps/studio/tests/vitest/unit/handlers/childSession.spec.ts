import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// connHandlers pulls in every db client through the connection provider, which
// fails to load under jsdom. A fake server whose connect() the test controls stands in.
const mockConnection = {
  connectionType: "mysql",
  connect: vi.fn(async () => undefined),
  disconnect: vi.fn(async () => undefined),
  server: { config: {} },
  database: { database: "shop" },
};
const mockServer = {
  createConnection: () => mockConnection,
  disconnect: vi.fn(),
  end: vi.fn(),
};
vi.mock("@commercial/backend/lib/connection-provider", () => ({
  __esModule: true,
  default: { for: () => mockServer },
}));

import { ConnHandlers } from "@commercial/backend/handlers/connHandlers";
import { childSessionKey, newState, removeState, sessionForRequest, state } from "@/handlers/handlerState";
import { TestOrmConnection } from "@tests/lib/TestOrmConnection";

const W1 = "w1";
const W2 = "w2";

describe("child utility sessions", () => {
  beforeEach(() => {
    newState(W1);
    newState(W2);
    state(W1).port = { name: "w1-port" } as any;
    state(W2).port = { name: "w2-port" } as any;
  });

  afterEach(async () => {
    await removeState(W1);
    await removeState(W2);
  });

  it("creates a child session that shares the window port", () => {
    const key = childSessionKey(W1, 7);
    expect(key).toBe("w1::connection::7");
    expect(state(key)).toBeUndefined();

    const child = sessionForRequest(key);
    expect(child).toBe(state(key));
    expect(child.port).toBe(state(W1).port);
    // a second request reuses it
    expect(sessionForRequest(key)).toBe(child);
    // the window's own state is untouched
    expect(state(W1).server).toBeNull();

    // no parent window session, no child
    expect(() => sessionForRequest("x9::connection::7")).toThrow(/x9/);
    expect(state("x9::connection::7")).toBeUndefined();
  });

  it("closing a window removes its child sessions", async () => {
    const ends = [vi.fn(), vi.fn(), vi.fn()];
    for (const [i, key] of [childSessionKey(W1, 7), childSessionKey(W1, 9), childSessionKey(W2, 7)].entries()) {
      sessionForRequest(key);
      state(key).server = { end: ends[i] } as any;
      state(key).connection = mockConnection as any;
    }

    await removeState(W1);

    expect(state(W1)).toBeUndefined();
    expect(state("w1::connection::7")).toBeUndefined();
    expect(state("w1::connection::9")).toBeUndefined();
    expect(ends[0]).toHaveBeenCalled();
    expect(ends[1]).toHaveBeenCalled();
    expect(state("w2::connection::7")).toBeDefined();
    expect(ends[2]).not.toHaveBeenCalled();
  });
});

describe("conn/create in a child session", () => {
  beforeEach(async () => {
    await TestOrmConnection.connect();
    newState(W1);
    state(W1).port = { name: "w1-port" } as any;
    mockConnection.connect.mockReset().mockResolvedValue(undefined);
    mockServer.disconnect.mockReset();
  });

  afterEach(async () => {
    await removeState(W1);
    await TestOrmConnection.disconnect();
  });

  it("a failed create leaves the child session without a server", async () => {
    const key = childSessionKey(W1, 7);
    sessionForRequest(key);
    mockConnection.connect.mockRejectedValue(new Error("ER_ACCESS_DENIED_ERROR: Access denied for user"));

    await expect(
      ConnHandlers["conn/create"]({ config: { id: 7, connectionType: "mysql" } as any, osUser: "tester", sId: key })
    ).rejects.toThrow(/Access denied/);

    expect(state(key).server).toBeNull();
    expect(mockServer.disconnect).toHaveBeenCalled();
    // the window's session is untouched
    expect(state(W1).server).toBeNull();
  });
});
