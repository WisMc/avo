import { describe, it, expect, beforeEach } from "vitest";
import { windowStore, WindowState } from "../src/window-manager";

describe("WindowStore", () => {
  beforeEach(() => {
    windowStore.getAll().forEach(w => windowStore.delete(w.id));
  });

  it("should create a window", () => {
    const win = windowStore.create("w1", "Test", { x: 0, y: 0, width: 100, height: 100 }, 0);
    expect(win.id).toBe("w1");
    expect(win.name).toBe("Test");
    expect(win.displayMode).toBe("info");
    expect(win.isLocked).toBe(false);
  });

  it("should get a window by id", () => {
    windowStore.create("w2", "Test2", { x: 0, y: 0, width: 100, height: 100 }, 0);
    const win = windowStore.get("w2");
    expect(win?.name).toBe("Test2");
  });

  it("should return undefined for non-existent window", () => {
    const win = windowStore.get("nonexistent");
    expect(win).toBeUndefined();
  });

  it("should update a window", () => {
    windowStore.create("w3", "Test3", { x: 0, y: 0, width: 100, height: 100 }, 0);
    windowStore.update("w3", { isLocked: true, name: "Updated" });
    const win = windowStore.get("w3");
    expect(win?.isLocked).toBe(true);
    expect(win?.name).toBe("Updated");
  });

  it("should delete a window", () => {
    windowStore.create("w4", "Test4", { x: 0, y: 0, width: 100, height: 100 }, 0);
    windowStore.delete("w4");
    expect(windowStore.get("w4")).toBeUndefined();
  });

  it("should notify listeners on change", () => {
    let notified = false;
    windowStore.subscribe(() => { notified = true; });
    windowStore.create("w5", "Test5", { x: 0, y: 0, width: 100, height: 100 }, 0);
    expect(notified).toBe(true);
  });

  it("should get all windows", () => {
    windowStore.create("w6", "Test6", { x: 0, y: 0, width: 100, height: 100 }, 0);
    windowStore.create("w7", "Test7", { x: 0, y: 0, width: 100, height: 100 }, 0);
    const all = windowStore.getAll();
    expect(all.length).toBe(2);
  });

  it("should unsubscribe listener", () => {
    let count = 0;
    const unsub = windowStore.subscribe(() => { count++; });
    windowStore.create("w8", "Test8", { x: 0, y: 0, width: 100, height: 100 }, 0);
    unsub();
    windowStore.create("w9", "Test9", { x: 0, y: 0, width: 100, height: 100 }, 0);
    expect(count).toBe(1);
  });
});
