# AVO - AI Vision Overlay

Desktop overlay application for sharing targeted screen regions with AI agents via MCP.

## Features

- **Overlay Windows** - Draggable, resizable windows with glow borders
- **Multi-Monitor Support** - Windows can span across all displays
- **AI Integration** - MCP server for AI agent communication
- **Permission System** - Many-to-many relationship between AI agents and windows
- **Metadata** - Locked and dynamic info per window with lock mechanism
- **Templates** - Pre-configured window layouts (Code Review, Debug Mode, Documentation)
- **Screenshot Management** - Capture, history, stitching

## Architecture

```
┌─────────────┐     WebSocket      ┌─────────────┐
│  AI Agent   │◄──────────────────►│ MCP Server  │
└─────────────┘                    └──────┬──────┘
                                         │
                                    WebSocket
                                         │
┌─────────────┐                   ┌─────▼─────┐
│   User      │◄──────────────────►│  Overlay  │
│  (manual)   │   mouse / UI       │   App     │
└─────────────┘                   └───────────┘
```

## Tech Stack

- **Overlay App**: Tauri (Rust + webview)
- **MCP Server**: Node.js, TypeScript, @modelcontextprotocol/sdk
- **Communication**: WebSocket

## Quick Start

### Build MCP Server

```bash
cd avo-mcp
npm install
npm run build
```

### Run MCP Server

```bash
npm run dev
# or for production
node dist/index.js
```

### Connect AI

Set `AVO_AGENT_ID` environment variable:
```bash
AVO_AGENT_ID=my-agent node dist/index.js
```

If not set, a unique ID is auto-generated.

## Multi-Instance Usage

Each AI agent instance should have a unique `AVO_AGENT_ID`:

```bash
# Terminal 1: OpenCode with agent "user1-session1"
AVO_AGENT_ID=user1-session1 node dist/index.js

# Terminal 2: OpenCode with agent "user2-session2"  
AVO_AGENT_ID=user2-session2 node dist/index.js
```

**Permission model:**
- Windows can be assigned to multiple agents (shared view)
- Each agent sees only windows it has permission to
- Permissions are managed via `avo_update_metadata` with `subscribers`

## MCP Tools

| Tool | Description |
|------|-------------|
| `avo_list_windows` | List all accessible windows |
| `avo_get_window` | Get window details |
| `avo_capture_screenshot` | Capture window screenshot |
| `avo_move_window` | Move window to position |
| `avo_resize_window` | Resize window |
| `avo_update_metadata` | Update locked/dynamic info |
| `avo_set_display_mode` | Set display mode |
| `avo_stitch_screenshots` | Combine multiple screenshots |
| `avo_get_history` | Get screenshot history |

## Project Structure

```
SS_system/
├── avo-app/           # Tauri overlay application
│   └── src/
│       ├── main.ts
│       ├── overlay.ts
│       ├── window-manager.ts
│       ├── metadata-editor.ts
│       ├── templates.ts
│       ├── screenshot.ts
│       └── websocket-client.ts
├── avo-mcp/           # MCP server
│   └── src/
│       ├── index.ts
│       ├── tools.ts
│       ├── permissions.ts
│       ├── server.ts
│       ├── window-state.ts
│       └── types.ts
└── docs/              # Documentation
```

## License

MIT
