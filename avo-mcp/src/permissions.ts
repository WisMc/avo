export class PermissionManager {
  private permissions: Map<string, Set<string>> = new Map();

  grant(windowId: string, agentId: string): void {
    if (!this.permissions.has(windowId)) {
      this.permissions.set(windowId, new Set());
    }
    this.permissions.get(windowId)!.add(agentId);
  }

  revoke(windowId: string, agentId: string): void {
    this.permissions.get(windowId)?.delete(agentId);
  }

  hasAccess(windowId: string, agentId: string): boolean {
    const subscribers = this.permissions.get(windowId);
    return subscribers?.has(agentId) ?? false;
  }

  getAccessibleWindows(agentId: string): string[] {
    const accessible: string[] = [];
    for (const [windowId, agents] of this.permissions) {
      if (agents.has(agentId)) {
        accessible.push(windowId);
      }
    }
    return accessible;
  }

  revokeAll(windowId: string): void {
    this.permissions.delete(windowId);
  }
}

export const permissionManager = new PermissionManager();
