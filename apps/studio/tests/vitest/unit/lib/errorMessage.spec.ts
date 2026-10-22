import { describe, it, expect } from "vitest";
import { errorMessage } from "@/lib/errors";

// Live validation: a refused connection threw an AggregateError with an empty
// message, so its tree node showed a blank error.
describe("errorMessage", () => {
  it("returns the message of an error", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
  });

  it("joins the inner messages of an AggregateError with an empty message", () => {
    const e = new AggregateError([
      new Error("connect ECONNREFUSED ::1:55433"),
      new Error("connect ECONNREFUSED 127.0.0.1:55433"),
    ], "");

    expect(errorMessage(e)).toBe("connect ECONNREFUSED ::1:55433; connect ECONNREFUSED 127.0.0.1:55433");
  });

  it("falls back to the code, then the name, when there is no message", () => {
    expect(errorMessage(Object.assign(new AggregateError([], ""), { code: "ECONNREFUSED" }))).toBe("ECONNREFUSED");
    expect(errorMessage(new AggregateError([], ""))).toBe("AggregateError");
  });

  it("returns a thrown non-error value as is", () => {
    expect(errorMessage("plain failure")).toBe("plain failure");
  });
});
