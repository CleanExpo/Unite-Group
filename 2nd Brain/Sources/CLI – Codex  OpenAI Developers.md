---
title: "CLI – Codex | OpenAI Developers"
source: "https://developers.openai.com/codex/cli"
author:
published:
created: 2026-05-19
description: "Pair with Codex in your terminal"
tags:
  - "clippings"
---
Codex CLI is OpenAI’s coding agent that you can run locally from your terminal. It can read, change, and run code on your machine in the selected directory. It’s [open source](https://github.com/openai/codex) and built in Rust for speed and efficiency.

ChatGPT Plus, Pro, Business, Edu, and Enterprise plans include Codex. Learn more about [what’s included](https://developers.openai.com/codex/pricing).

![](https://www.youtube.com/watch?v=iqNzfK4_meQ)
  

## CLI setup

1. 1
	### Install
	Install the Codex CLI with npm.
	npm i -g @openai/codex
2. 2
	### Run
	Run Codex in a terminal. It can inspect your repository, edit files, and run commands.
	codex
	The first time you run Codex, you'll be prompted to sign in. Authenticate with your ChatGPT account or an API key.
	See the [pricing page](https://developers.openai.com/codex/pricing) if you're not sure which plans include Codex access.
3. 3
	### Upgrade
	New versions of the Codex CLI are released regularly. See the [changelog](https://developers.openai.com/codex/changelog) for release notes. To upgrade with npm, run:
	npm i -g @openai/codex@latest

The Codex CLI is available on macOS, Windows, and Linux. On Windows, run Codex natively in PowerShell with the Windows sandbox, or use WSL2 when you need a Linux-native environment. For setup details, see the [Windows setup guide](https://developers.openai.com/codex/windows).

If you’re new to Codex, read the [best practices guide](https://developers.openai.com/codex/learn/best-practices).

---

## Work with the Codex CLI### [Run Codex interactively](https://developers.openai.com/codex/cli/features#running-in-interactive-mode)

[

Run `codex` to start an interactive terminal UI (TUI) session.

](https://developers.openai.com/codex/cli/features#running-in-interactive-mode)### Control model and reasoning

Use `/model` to switch between GPT-5.4, GPT-5.3-Codex, and other available models, or adjust reasoning levels.

[View original](https://developers.openai.com/codex/cli/features#models-reasoning)### Image inputs

Attach screenshots or design specs so Codex reads them alongside your prompt.

[View original](https://developers.openai.com/codex/cli/features#image-inputs)### Image generation

Generate or edit images directly in the CLI, and attach references when you want Codex to iterate on an existing asset.

[View original](https://developers.openai.com/codex/cli/features#image-generation)### Run local code review

Get your code reviewed by a separate Codex agent before you commit or push your changes.

[View original](https://developers.openai.com/codex/cli/features#running-local-code-review)### Use subagents

Use subagents to parallelize complex tasks.

[View original](https://developers.openai.com/codex/subagents)### Web search

Use Codex to search the web and get up-to-date information for your task.

[View original](https://developers.openai.com/codex/cli/features#web-search)### Codex Cloud tasks

Launch a Codex Cloud task, choose environments, and apply the resulting diffs without leaving your terminal.

[View original](https://developers.openai.com/codex/cli/features#working-with-codex-cloud)### Scripting Codex

Automate repeatable workflows by scripting Codex with the `exec` command.

[View original](https://developers.openai.com/codex/noninteractive)### Model Context Protocol

Give Codex access to additional third-party tools and context with Model Context Protocol (MCP).

[View original](https://developers.openai.com/codex/mcp)### Approval modes

Choose the approval mode that matches your comfort level before Codex edits or runs commands.

[View original](https://developers.openai.com/codex/cli/features#approval-modes)