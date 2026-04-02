import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as tools from "./tools.js";

const MANIFEST = {
  name: "avo",
  version: "1.0.0",
  description: "Overlay window manager for AI vision. Create, position and share screen regions with AI agents.",
  capabilities: {
    tools: true,
    resources: true,
  },
};

const server = new Server(
  MANIFEST,
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "avo_list_windows",
        description: "List all overlay windows accessible to this AI agent",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "avo_get_window",
        description: "Get details of a specific overlay window",
        inputSchema: {
          type: "object",
          properties: {
            window_id: { type: "string", description: "Window ID" }
          },
          required: ["window_id"]
        }
      },
      {
        name: "avo_capture_screenshot",
        description: "Capture a screenshot of an overlay window",
        inputSchema: {
          type: "object",
          properties: {
            window_id: { type: "string", description: "Window ID" },
            save_to_temp: { type: "boolean", description: "Save to temp folder", default: true }
          },
          required: ["window_id"]
        }
      },
      {
        name: "avo_move_window",
        description: "Move an overlay window to a new position",
        inputSchema: {
          type: "object",
          properties: {
            window_id: { type: "string" },
            x: { type: "number" },
            y: { type: "number" }
          },
          required: ["window_id", "x", "y"]
        }
      },
      {
        name: "avo_resize_window",
        description: "Resize an overlay window",
        inputSchema: {
          type: "object",
          properties: {
            window_id: { type: "string" },
            width: { type: "number" },
            height: { type: "number" }
          },
          required: ["window_id", "width", "height"]
        }
      },
      {
        name: "avo_update_metadata",
        description: "Update locked or dynamic metadata of a window",
        inputSchema: {
          type: "object",
          properties: {
            window_id: { type: "string" },
            locked_info: { type: "object" },
            dynamic_info: { type: "object" },
            lock_dynamic: { type: "boolean" }
          },
          required: ["window_id"]
        }
      },
      {
        name: "avo_set_display_mode",
        description: "Set display mode (minimal/info/full)",
        inputSchema: {
          type: "object",
          properties: {
            window_id: { type: "string" },
            display_mode: { type: "string", enum: ["minimal", "info", "full"] }
          },
          required: ["window_id", "display_mode"]
        }
      },
      {
        name: "avo_stitch_screenshots",
        description: "Stitch multiple window screenshots into one image",
        inputSchema: {
          type: "object",
          properties: {
            window_ids: { type: "array", items: { type: "string" } }
          },
          required: ["window_ids"]
        }
      },
      {
        name: "avo_get_history",
        description: "Get screenshot history for windows",
        inputSchema: {
          type: "object",
          properties: {
            window_id: { type: "string" },
            limit: { type: "number", default: 10 }
          }
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const agentId = process.env.AVO_AGENT_ID || "anonymous";
  const ctx = { agentId };
  
  try {
    switch (name) {
      case "avo_list_windows":
        return { content: [{ type: "text", text: JSON.stringify(await tools.avoListWindows(args as any, ctx)) }] };
      case "avo_get_window":
        return { content: [{ type: "text", text: JSON.stringify(await tools.avoGetWindow(args as any, ctx)) }] };
      case "avo_capture_screenshot":
        return { content: [{ type: "text", text: JSON.stringify(await tools.avoCaptureScreenshot(args as any, ctx)) }] };
      case "avo_move_window":
        return { content: [{ type: "text", text: JSON.stringify(await tools.avoMoveWindow(args as any, ctx)) }] };
      case "avo_resize_window":
        return { content: [{ type: "text", text: JSON.stringify(await tools.avoResizeWindow(args as any, ctx)) }] };
      case "avo_update_metadata":
        return { content: [{ type: "text", text: JSON.stringify(await tools.avoUpdateMetadata(args as any, ctx)) }] };
      case "avo_set_display_mode":
        return { content: [{ type: "text", text: JSON.stringify(await tools.avoSetDisplayMode(args as any, ctx)) }] };
      case "avo_stitch_screenshots":
        return { content: [{ type: "text", text: JSON.stringify(await tools.avoStitchScreenshots(args as any, ctx)) }] };
      case "avo_get_history":
        return { content: [{ type: "text", text: JSON.stringify(await tools.avoGetHistory(args as any, ctx)) }] };
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [{ type: "text", text: error.message }],
      isError: true
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
