import { describe, it, expect, beforeEach } from "vitest";
import { permissionManager } from "../src/permissions";

describe("PermissionManager", () => {
  beforeEach(() => {
    permissionManager.permissions.clear();
  });

  it("should grant access", () => {
    permissionManager.grant("w1", "agent1");
    expect(permissionManager.hasAccess("w1", "agent1")).toBe(true);
  });

  it("should not have access by default", () => {
    expect(permissionManager.hasAccess("w1", "agent1")).toBe(false);
  });

  it("should revoke access", () => {
    permissionManager.grant("w2", "agent1");
    permissionManager.revoke("w2", "agent1");
    expect(permissionManager.hasAccess("w2", "agent1")).toBe(false);
  });

  it("should allow multiple agents to access same window", () => {
    permissionManager.grant("w3", "agent1");
    permissionManager.grant("w3", "agent2");
    expect(permissionManager.hasAccess("w3", "agent1")).toBe(true);
    expect(permissionManager.hasAccess("w3", "agent2")).toBe(true);
  });

  it("should allow same agent to access multiple windows", () => {
    permissionManager.grant("w4", "agent1");
    permissionManager.grant("w5", "agent1");
    expect(permissionManager.hasAccess("w4", "agent1")).toBe(true);
    expect(permissionManager.hasAccess("w5", "agent1")).toBe(true);
  });

  it("should list accessible windows for agent", () => {
    permissionManager.grant("w6", "agent1");
    permissionManager.grant("w7", "agent1");
    permissionManager.grant("w6", "agent2");
    const accessible = permissionManager.getAccessibleWindows("agent1");
    expect(accessible).toContain("w6");
    expect(accessible).toContain("w7");
    expect(accessible).not.toContain("w8");
  });

  it("should revoke all permissions for window", () => {
    permissionManager.grant("w9", "agent1");
    permissionManager.grant("w9", "agent2");
    permissionManager.revokeAll("w9");
    expect(permissionManager.hasAccess("w9", "agent1")).toBe(false);
    expect(permissionManager.hasAccess("w9", "agent2")).toBe(false);
  });
});
