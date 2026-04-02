import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

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
        description: "List all overlay windows and their current state",
        inputSchema: { type: "object", properties: {} }
      },
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return { content: [{ type: "text", text: "Not implemented yet" }], isError: true };
});

const transport = new StdioServerTransport();
server.connect(transport);