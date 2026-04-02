// avo-app/src/metadata-editor.ts

import { windowStore, WindowState } from "./window-manager.js";
import { wsClient } from "./websocket-client.js";

export function createMetadataEditor(container: HTMLElement, windowId: string) {
  const state = windowStore.get(windowId);
  if (!state) return;
  
  const lockedSection = document.createElement("div");
  lockedSection.className = "metadata-section locked";
  
  const lockedHeader = document.createElement("div");
  lockedHeader.className = "section-header";
  lockedHeader.innerHTML = `<span>🔒 Locked</span>`;
  lockedSection.appendChild(lockedHeader);
  
  const lockedContent = document.createElement("div");
  lockedContent.className = "section-content";
  lockedContent.id = "metadata-locked";
  renderInfo(lockedContent, state.lockedInfo);
  lockedSection.appendChild(lockedContent);
  
  const dynamicSection = document.createElement("div");
  dynamicSection.className = "metadata-section dynamic";
  
  const dynamicHeader = document.createElement("div");
  dynamicHeader.className = "section-header";
  dynamicHeader.innerHTML = `<span>📝 Dynamic</span><button class="lock-btn">${state.isLocked ? "🔒" : "🔓"}</button>`;
  dynamicSection.appendChild(dynamicHeader);
  
  const dynamicContent = document.createElement("div");
  dynamicContent.className = "section-content";
  dynamicContent.id = "metadata-dynamic";
  renderInfo(dynamicContent, state.dynamicInfo);
  dynamicSection.appendChild(dynamicContent);
  
  const addInput = document.createElement("input");
  addInput.className = "metadata-input";
  addInput.placeholder = "Add note...";
  addInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && addInput.value.trim()) {
      const newInfo = { ...state.dynamicInfo };
      newInfo[`note_${Date.now()}`] = addInput.value.trim();
      windowStore.update(windowId, { dynamicInfo: newInfo });
      renderInfo(dynamicContent, newInfo);
      addInput.value = "";
      broadcastUpdate(windowId);
    }
  });
  dynamicSection.appendChild(addInput);
  
  container.appendChild(lockedSection);
  container.appendChild(dynamicSection);
  
  const lockBtn = dynamicHeader.querySelector(".lock-btn")!;
  lockBtn.addEventListener("click", () => {
    const currentState = windowStore.get(windowId);
    if (!currentState) return;
    
    const newLockState = !currentState.isLocked;
    windowStore.update(windowId, { isLocked: newLockState });
    lockBtn.textContent = newLockState ? "🔒" : "🔓";
    broadcastUpdate(windowId);
  });
  
  windowStore.subscribe(() => {
    const updated = windowStore.get(windowId);
    if (updated && updated.id === windowId) {
      renderInfo(lockedContent, updated.lockedInfo);
      renderInfo(dynamicContent, updated.dynamicInfo);
      lockBtn.textContent = updated.isLocked ? "🔒" : "🔓";
    }
  });
}

function renderInfo(container: HTMLElement, info: Record<string, string>) {
  container.innerHTML = "";
  for (const [key, value] of Object.entries(info)) {
    const row = document.createElement("div");
    row.className = "info-row";
    row.innerHTML = `
      <span class="info-key">${key}:</span>
      <span class="info-value">${value}</span>
    `;
    container.appendChild(row);
  }
  
  if (Object.keys(info).length === 0) {
    container.innerHTML = '<span class="info-empty">No data</span>';
  }
}

function broadcastUpdate(windowId: string) {
  if (wsClient?.readyState === WebSocket.OPEN) {
    const state = windowStore.get(windowId);
    wsClient.send("window_update", { windowId, state });
  }
}