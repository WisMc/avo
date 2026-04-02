import { windowStore, WindowState } from "./window-manager.js";
import { createOverlayWindow } from "./overlay.js";

export interface WindowTemplate {
  name: string;
  description: string;
  windows: Array<{
    name: string;
    bounds: { x: number; y: number; width: number; height: number };
    displayMode: "minimal" | "info" | "full";
  }>;
}

const TEMPLATES: WindowTemplate[] = [
  {
    name: "Code Review",
    description: "Terminal + Editor + Notes",
    windows: [
      { name: "Terminal", bounds: { x: 0, y: 0, width: 600, height: 400 }, displayMode: "info" },
      { name: "Editor", bounds: { x: 610, y: 0, width: 800, height: 600 }, displayMode: "full" },
      { name: "Notes", bounds: { x: 0, y: 410, width: 600, height: 200 }, displayMode: "minimal" }
    ]
  },
  {
    name: "Debug Mode",
    description: "App + Logs side by side",
    windows: [
      { name: "App", bounds: { x: 0, y: 0, width: 800, height: 600 }, displayMode: "full" },
      { name: "Logs", bounds: { x: 810, y: 0, width: 400, height: 600 }, displayMode: "info" }
    ]
  },
  {
    name: "Documentation",
    description: "Browser + Notes + AI Chat",
    windows: [
      { name: "Browser", bounds: { x: 0, y: 0, width: 600, height: 500 }, displayMode: "info" },
      { name: "Notes", bounds: { x: 610, y: 0, width: 400, height: 500 }, displayMode: "full" },
      { name: "AI Chat", bounds: { x: 0, y: 510, width: 1010, height: 300 }, displayMode: "minimal" }
    ]
  }
];

export function getTemplates(): WindowTemplate[] {
  return TEMPLATES;
}

export async function applyTemplate(templateName: string, parent: HTMLElement): Promise<WindowState[]> {
  const template = TEMPLATES.find(t => t.name === templateName);
  if (!template) throw new Error(`Template not found: ${templateName}`);
  
  const created: WindowState[] = [];
  
  for (const winConfig of template.windows) {
    const id = `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const state = windowStore.create(
      id,
      winConfig.name,
      winConfig.bounds,
      0
    );
    state.displayMode = winConfig.displayMode;
    await createOverlayWindow(state, parent);
    created.push(state);
  }
  
  return created;
}

export function showTemplateSelector(parent: HTMLElement, onSelect: (templateName: string) => void) {
  const modal = document.createElement("div");
  modal.className = "template-modal";
  modal.innerHTML = `
    <div class="template-backdrop"></div>
    <div class="template-content">
      <h2>Select Layout</h2>
      <div class="template-list">
        ${TEMPLATES.map(t => `
          <button class="template-btn" data-name="${t.name}">
            <span class="template-name">${t.name}</span>
            <span class="template-desc">${t.description}</span>
          </button>
        `).join("")}
      </div>
    </div>
  `;
  
  const style = document.createElement("style");
  style.textContent = `
    .template-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .template-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
    }
    .template-content {
      position: relative;
      background: rgba(30, 30, 40, 0.95);
      border: 1px solid rgba(100, 200, 255, 0.3);
      border-radius: 12px;
      padding: 24px;
      min-width: 300px;
    }
    .template-content h2 {
      margin: 0 0 16px 0;
      color: white;
      font-size: 18px;
    }
    .template-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .template-btn {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      padding: 12px 16px;
      background: rgba(60, 60, 80, 0.5);
      border: 1px solid rgba(100, 200, 255, 0.2);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .template-btn:hover {
      background: rgba(80, 80, 100, 0.7);
      border-color: rgba(100, 200, 255, 0.5);
    }
    .template-name {
      color: white;
      font-weight: bold;
      font-size: 14px;
    }
    .template-desc {
      color: rgba(255, 255, 255, 0.6);
      font-size: 12px;
      margin-top: 4px;
    }
  `;
  modal.appendChild(style);
  
  document.body.appendChild(modal);
  
  modal.querySelector(".template-backdrop")?.addEventListener("click", () => {
    modal.remove();
  });
  
  modal.querySelectorAll(".template-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const name = (btn as HTMLElement).dataset.name!;
      modal.remove();
      onSelect(name);
    });
  });
}
