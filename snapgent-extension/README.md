```markdown
# Nyx V1

**A free AI agent for Roblox Studio — driven entirely from a normal AI chat.**

[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-lightgrey)](#)
[![License](https://img.shields.io/badge/license-GPL--3.0-blue)](LICENSE)

Nyx V1 connects the AI chat you already use to Roblox Studio. Ask for something in plain English — read a script, run Luau, generate a model, insert an asset — and it happens in Studio. No API key, no terminal, no setup headaches.

Maintained by [SharkCreepy](https://github.com/SharkCreepy).

---

## Contents

- [Why this exists](#why-this-exists)
- [Supported AI providers](#supported-ai-providers)
- [How it works](#how-it-works)
- [Setup](#setup)
- [What the AI can do](#what-the-ai-can-do)
- [Known quirks](#known-quirks)
- [Credits & license](#credits--license)

---

## Why this exists

Most "AI in Roblox" tools want an API key, a subscription, or a paid plan. Nyx V1 doesn't. If you can open ChatGPT in a browser tab, you can drive Studio with it. That's the whole point.

## Supported AI providers

| Provider | Site | Notes |
|---|---|---|
| **ChatGPT** | chatgpt.com | ✅ **Recommended** · screenshots / image input disabled |
| Claude | claude.ai | Screenshots / image input disabled |
| Google Gemini | gemini.google.com | May stop using tools in long sessions |
| Kimi | kimi.ai | Sometimes uses its own tools instead |
| GLM | chat.z.ai | — |
| Qwen | chat.qwen.ai | — |
| Arena | arena.ai | Must stay in **Direct** mode |
| Meta AI | meta.ai | — |

> Nyx V1 only works on the sites listed above. Anywhere else, it won't run.

## How it works

```

AI chat (your browser)
↓
Nyx V1 extension
↓
Bridge (your PC)
↓
Roblox Studio  (via built-in MCP server)

```

The extension injects a small bar into the chat page. When you send a request, it's forwarded to the Bridge running on your machine, which drives Studio through its MCP server.

## Setup

### 1. Install the extension

1. Download the latest zip from the **Releases** page and extract it.
2. Open `edge://extensions` or `chrome://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the `nyx-extension` folder.

> If your extracted folder is still called `snapgent-extension`, just rename it to `nyx-extension` — or pick the existing folder, both work.

### 2. Enable MCP in Roblox Studio

1. Open Studio and load a place.
2. Click **Assistant AI** in the top bar.
3. Click **...** → **Manage MCP Servers**.
4. Click **Enable Studio as MCP Server**. *(One-time setup.)*

### 3. Start the Bridge

- **Windows:** double-click `start.bat` in the extracted folder.
- **macOS:** double-click `MacOS_Start.command`.

On macOS, the first launch will show a security warning — that's normal for any script downloaded outside the App Store. Click **Done**, then go to **System Settings → Privacy & Security**, scroll down, and click **Open Anyway**. You only have to do this once.

A small window will open. That means the Bridge is running.

### 4. Start a session

1. Open one of the supported chat sites and start a **new chat**.
2. The Nyx V1 bar will appear above the input box.
3. Pick your target from the **MCP dropdown** (Roblox Studio, or VS Code, etc.).
4. Click **Start session** and type what you want to build.

## What the AI can do

- 📝 Read and edit scripts
- ⚡ Run Luau directly in Studio
- 🌳 Inspect the game tree and instances
- 🧊 Generate meshes, materials, and models
- 🛒 Browse and insert from the Creator Store
- ▶️ Control play-testing
- 🧠 **Remember your project across sessions** — memory is saved inside the place file itself

## Known quirks

These are **model behavior, not bugs in the extension**:

- **Gemini** may stop using Roblox tools after a while in long sessions. Start a new session if it starts replying in plain text.
- **Kimi** sometimes falls back to its own native tools instead of Roblox commands. Remind it to use the commands, or restart the session.
- **Arena** must stay in **Direct** mode. Nyx V1 blocks Battle / Side-by-Side / Agent modes on purpose — it only drives a single reply.
- **ChatGPT** and **Claude** don't support screenshots or image input in this integration.

## Credits & license

Nyx V1 is a rebranded and modified version of the **snapgentV3** project. All original copyright remains with its authors. Rebranding and modifications by [SharkCreepy](https://github.com/SharkCreepy).

Licensed under **GPL-3.0** — see [LICENSE](LICENSE).
```
