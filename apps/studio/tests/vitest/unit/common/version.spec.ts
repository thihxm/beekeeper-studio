import { describe, it, expect } from "vitest";
import { isVersionLessThanOrEqual, parseVersion } from "@/common/version";

// Ported from the version cases of the removed jest license.spec.ts.

function v(strings: TemplateStringsArray) {
  const [major, minor, patch] = strings[0].split(".");
  return {
    major: parseInt(major),
    minor: parseInt(minor),
    patch: parseInt(patch),
  };
}

describe("version", () => {
  it("parse version correctly", () => {
    expect(parseVersion("1.0.2")).toEqual({ major: 1, minor: 0, patch: 2 });
    expect(parseVersion("10.12.11")).toEqual({
      major: 10,
      minor: 12,
      patch: 11,
    });
  });

  it("isVersionLessThanOrEqual", () => {
    expect(isVersionLessThanOrEqual(v`1.2.3`, v`1.2.3`)).toBe(true);
    expect(isVersionLessThanOrEqual(v`1.2.1`, v`1.2.3`)).toBe(true);
    expect(isVersionLessThanOrEqual(v`1.2.3`, v`1.0.0`)).toBe(false);
    expect(isVersionLessThanOrEqual(v`1.3.2`, v`1.2.3`)).toBe(false);

    expect(isVersionLessThanOrEqual(v`1.99.99`, v`2.2.3`)).toBe(true);
    expect(isVersionLessThanOrEqual(v`1.1.99`, v`1.2.3`)).toBe(true);
    expect(isVersionLessThanOrEqual(v`1.1.99-beta.1`, v`1.1.99-beta.2`)).toBe(true);
    expect(isVersionLessThanOrEqual(v`1.1.99`, v`1.2.0-beta.1`)).toBe(true);
  });

  it("Should properly compare versions", () => {
    expect(isVersionLessThanOrEqual(parseVersion("v2.4.6"), parseVersion("v5.7.2"))).toBeTruthy();
    expect(isVersionLessThanOrEqual(parseVersion("v2.5.1-beta.4"), parseVersion("v5.0.0"))).toBeTruthy();
    expect(isVersionLessThanOrEqual(parseVersion("v6.3.7"), parseVersion("v4.2.1"))).not.toBeTruthy();
    expect(isVersionLessThanOrEqual(parseVersion("v3.1.3-beta.4"), parseVersion("v1.8.1"))).not.toBeTruthy();
    expect(isVersionLessThanOrEqual(parseVersion("v5.0.0"), parseVersion("v5.0.0"))).toBeTruthy();
  });
});
