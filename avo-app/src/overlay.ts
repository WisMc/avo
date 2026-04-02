import { windowStore, WindowState } from "./window-manager.js";

let wsClient: WebSocket | null = null;

export function setWsClient(ws: WebSocket) {
  wsClient = ws;
}

export async function createOverlayWindow(state: WindowState, parent: HTMLElement): Promise<HTMLElement> {
  const container = document.createElement("div");
  container.id = `overlay-${state.id}`;
  container.className = "overlay";
  container.style.cssText = `
    position: fixed;
    left: ${state.bounds.x}px;
    top: ${state.bounds.y}px;
    width: ${state.bounds.width}px;
    height: ${state.bounds.height}px;
  `;
  
  const header = document.createElement("div");
  header.className = "header";
  header.innerHTML = `
    <span id="window-id">${state.name}</span>
    <div id="controls">
      <button id="btn-close">×</button>
    </div>
  `;
  container.appendChild(header);
  
  const content = document.createElement("div");
  content.id = "content";
  container.appendChild(content);
  
  const aiIndicator = document.createElement("div");
  aiIndicator.className = "ai-indicator hidden";
  aiIndicator.textContent = "AI viewing";
  container.appendChild(aiIndicator);
  
  parent.appendChild(container);
  
  setupDrag(container, header, state.id);
  setupResize(container, state.id);
  setupCloseButton(container, state.id);
  
  windowStore.subscribe(() => {
    const updated = windowStore.get(state.id);
    if (updated) {
      if (updated.isAIViewing) {
        aiIndicator.classList.remove("hidden");
        aiIndicator.classList.add("visible");
        container.style.borderColor = "rgba(100, 255, 150, 0.8)";
      } else {
        aiIndicator.classList.remove("visible");
        aiIndicator.classList.add("hidden");
        container.style.borderColor = "";
      }
    }
  });
  
  return container;
}

function setupDrag(container: HTMLElement, handle: HTMLElement, windowId: string) {
  let isDragging = false;
  let startX: number, startY: number, startLeft: number, startTop: number;

  handle.addEventListener("mousedown", (e) => {
    if ((e.target as HTMLElement).id === "btn-close") return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = container.offsetLeft;
    startTop = container.offsetTop;
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    container.style.left = `${startLeft + dx}px`;
    container.style.top = `${startTop + dy}px`;
  });

  document.addEventListener("mouseup", () => {
    if (!isDragging) return;
    isDragging = false;
    const bounds = {
      x: container.offsetLeft,
      y: container.offsetTop,
      width: container.offsetWidth,
      height: container.offsetHeight,
    };
    windowStore.update(windowId, { bounds });
    broadcastWindowUpdate(windowId);
  });
}

function setupResize(container: HTMLElement, windowId: string) {
  let isResizing = false;
  let startX: number, startY: number, startW: number, startH: number;

  container.addEventListener("mousedown", (e) => {
    if ((e.target as HTMLElement).classList.contains("header")) return;
    const rect = container.getBoundingClientRect();
    const cornerX = rect.right - e.clientX;
    const cornerY = rect.bottom - e.clientY;
    
    if (cornerX < 10 && cornerY < 10) {
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startW = container.offsetWidth;
      startH = container.offsetHeight;
      e.preventDefault();
    }
  });

  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;
    const dw = e.clientX - startX;
    const dh = e.clientY - startY;
    container.style.width = `${Math.max(100, startW + dw)}px`;
    container.style.height = `${Math.max(80, startH + dh)}px`;
  });

  document.addEventListener("mouseup", () => {
    if (!isResizing) return;
    isResizing = false;
    const bounds = {
      x: container.offsetLeft,
      y: container.offsetTop,
      width: container.offsetWidth,
      height: container.offsetHeight,
    };
    windowStore.update(windowId, { bounds });
    broadcastWindowUpdate(windowId);
  });
}

function setupCloseButton(container: HTMLElement, windowId: string) {
  const btn = container.querySelector("#btn-close");
  btn?.addEventListener("click", () => {
    windowStore.delete(windowId);
    container.remove();
    broadcastWindowUpdate(windowId);
  });
}

function broadcastWindowUpdate(windowId: string) {
  if (wsClient?.readyState === WebSocket.OPEN) {
    const state = windowStore.get(windowId);
    wsClient.send(JSON.stringify({ type: "window_update", windowId, state }));
  }
}
