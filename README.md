```markdown
# Nyx V1 - Free AI Agent for Roblox Studio

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-lightgrey)
![License](https://img.shields.io/badge/license-GPL--3.0-blue)

**Nyx V1** is a free browser extension that turns ChatGPT, Claude, Gemini, Kimi, GLM, Qwen, Arena or Meta AI into a Roblox Studio AI agent.
Control Roblox Studio with AI directly from your browser - read/edit scripts, run Luau, generate assets, all from a normal AI chat. No API key, no terminal, no coding needed.

Maintained by [SharkCreepy](https://github.com/SharkCreepy).

Eight AI providers are supported: **ChatGPT** (chatgpt.com, recommended), **Claude** (claude.ai), **Google Gemini** (gemini.google.com), **Kimi** (kimi.ai, Moonshot AI), **GLM** (chat.z.ai, Z.ai), **Qwen** (chat.qwen.ai), **Arena** (arena.ai, a multi-model playground) and **Meta AI** (meta.ai). On ChatGPT and Claude, screenshots and image input are disabled in this integration. Gemini and Kimi can be unstable: Gemini tends to stop using the Roblox tools in long sessions, and Kimi sometimes uses its own native tools instead of the Roblox commands. On Arena, use **Direct** mode (Nyx V1 only supports Direct; it blocks Start in Battle / Side-by-Side / Agent modes). ChatGPT is the recommended provider.

## ⚠️ Nyx V1 is Free — Beware of Paid Copycats

Nyx V1 is 100% free and open-source. It always has been, and it always will be. There is no official paid version, no subscription, and no sign-in required to use the extension.

If you come across a site or extension using the Nyx V1 name that asks for payment or account creation, it is **not** this project. The only official links are the repository and Releases page for this project.

## How it works

```

AI chat (ChatGPT / Claude / Gemini / Kimi / GLM / Qwen / Arena / Meta AI, in your browser) -> Nyx V1 Extension -> Bridge (your PC) -> Roblox Studio

```

The extension runs inside the chat page (ChatGPT, Claude, Gemini, Kimi, GLM, Qwen, Arena or Meta AI). When you type a request, it sends commands to the Bridge running on your PC, which drives Roblox Studio through the built-in MCP server.

## Setup

### 1. Download the zip and install the extension

Download the latest zip from the **Releases** page and extract it. The zip contains both the **Bridge** and the **extension folder**.

To load the extension:

- Go to `edge://extensions` (Edge) or `chrome://extensions` (Chrome)
- Enable **Developer mode** (top right toggle)
- Click **Load unpacked**
- Select the `nyx-extension` folder from the extracted zip

### 2. Start Roblox Studio and enable MCP

Open Studio and load a Place, then enable MCP (first time only):

- Click **Assistant AI** in the top bar
- Click **...** (top right of the Assistant panel)
- Click **Manage MCP Servers**
- Click **Enable Studio as MCP Server**

### 3. Run the Bridge

- **Windows:** double-click `start.bat` inside the extracted folder.
- **macOS:** double-click `MacOS_Start.command` inside the extracted folder. The first time, macOS will show a security warning ("could not verify... free of malware") - this is normal for any script downloaded outside the App Store, click **Done**, then go to **System Settings > Privacy & Security**, scroll to the bottom, and click **Open Anyway**. You only need to do this once.

A small window opens, that means the Bridge is running.

### 4. Start a session

Go to https://chatgpt.com (recommended), https://claude.ai, https://gemini.google.com, https://www.kimi.ai, https://chat.z.ai, https://chat.qwen.ai, https://arena.ai or https://www.meta.ai and open a new chat. The Nyx V1 bar appears above the input box. Click **Start session**. Type what you want to build.

Use the MCP target dropdown in the chat bar to choose **Roblox Studio** or a configured server such as **VS Code** before starting a session. The provider dropdown opens the supported AI chat sites.

> Only works on chatgpt.com, claude.ai, gemini.google.com, kimi.ai, chat.z.ai, chat.qwen.ai, arena.ai and meta.ai - it will not work on any other site.
>
> On Arena, keep the mode dropdown on **Direct** - Nyx V1 blocks Start in Battle / Side-by-Side / Agent modes (it only drives a single Direct reply).
>
> Gemini and Kimi can be unstable (model behavior, not the extension): Gemini may stop using the Roblox tools after a while, and Kimi may use its own native tools instead. If the AI starts answering in plain text instead of acting, remind it to use the commands or start a new session.

## What the AI can do

- Read and edit scripts
- Run Luau code directly in Studio
- Inspect the game tree and instances
- Generate meshes, materials, and models
- Browse and insert from the Creator Store
- Control play-testing
- **Remember your project across sessions** — persistent project memory saved inside your place

## Credits / License

Nyx V1 is a rebranded/modified version of the nyx project. The original project and its authors retain their copyright. Rebranding and modifications by SharkCreepy.

Licensed under **GPL-3.0**.
```
