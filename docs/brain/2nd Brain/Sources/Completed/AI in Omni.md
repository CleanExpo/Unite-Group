---
title: "AI in Omni"
source: "https://docs.omni.co/ai"
author:
published:
created: 2026-05-21
description: "Omni's AI is grounded in your semantic model — delivering accurate, governed analytics through natural language."
tags:
  - "clippings"
---
Omni’s AI is built on your organization’s [semantic model](https://docs.omni.co/modeling) — the layer that defines your metrics, relationships, and business logic. This means AI-generated queries use the same governed definitions as the rest of Omni, so results are consistent and trustworthy. User permissions are enforced across every AI surface, and your data is never used to train models.

The fastest way to get started is with the [Omni Agent](https://docs.omni.co/ai/chat), where you can ask questions about your data in plain language.

## Ask questions about your data

Omni provides several AI-powered surfaces for exploring your data with natural language:

## [Omni Agent](https://docs.omni.co/ai/chat)

A standalone chat experience for exploring data. Ask questions, generate queries and visualizations, and create dashboards — no workbook setup needed.

## [Workbook Agent](https://docs.omni.co/ai/queries)

Build and refine queries using natural language inside a [workbook](https://docs.omni.co/analyze-explore/workbook-basics) — Omni’s core environment for building and saving analyses.

## [Skills](https://docs.omni.co/ai/skills)

Reusable, one-click AI processes for standardized reports, guided lookups, and data quality checks.

## [Dashboard Agent](https://docs.omni.co/ai/dashboard-assistant)

Ask questions directly on a published dashboard. Click a chart to scope the conversation, drill into subsets, or request summaries without leaving the page.

## AI-assisted building

Beyond helping you create queries, AI is embedded throughout Omni to help you build, visualize, and more:

## [Modeling Agent](https://docs.omni.co/ai/model-assistant)

Chat while you edit YAML in the Model IDE—ask about relationships, draft measures and topics, and review proposed changes.

## [Formula builder](https://docs.omni.co/analyze-explore/calculations#ai-generated)

Describe a calculation in plain English and get a working Excel-style formula.

## [Visualizations](https://docs.omni.co/ai/visualizations)

Describe the chart you want and the AI will create and configure it for you.

## [Forecasting](https://docs.omni.co/ai/forecasting)

Generate statistical forecasts and projections for time-series data using natural language.

## Improve AI quality

Omni’s AI uses your defined metrics, relationships, and business logic — not guesswork on raw tables. To further improve accuracy:

- **[Optimize your models for AI](https://docs.omni.co/modeling/develop/ai-optimization)** — Add descriptions, sample values, and synonyms to help the AI select the right fields and interpret questions correctly.
- **[Learn from conversation](https://docs.omni.co/ai/learn-from-conversation)** — Let the AI capture business context from your conversations and encode it into the model for future queries.
- **Rate AI responses** using the / icons in the Omni app or on [Omni Slack Agent](https://docs.omni.co/integrations/omni-slack-agent) responses to help improve result quality.

## Data security

Omni’s AI is designed to respect your existing security boundaries. Your data stays protected and is never used to train models.

- **Permissions** — Every AI query respects row-level security and user-level access controls. Users only see data they’re authorized to access.
- **[Data security](https://docs.omni.co/ai/security)** — By default, Omni uses Claude on AWS Bedrock. Your data is never used to train models. Organizations can also configure [Anthropic Direct, OpenAI, Snowflake Cortex, or Grok (xAI)](https://docs.omni.co/ai/settings/model-providers).

## Manage and customize

To configure AI features or customize branding, go to [**Settings > AI**](https://docs.omni.co/ai/settings).

Keep an eye on your usage with the [Token tracking dashboard](https://docs.omni.co/administration/token-tracking) in your instance’s [**Analytics** section](https://docs.omni.co/administration/analytics).

## Use Omni in other tools

Bring Omni’s AI-powered analytics into the tools your team already uses.

## [MCP Server](https://docs.omni.co/ai/mcp)

Query your Omni data from Claude Desktop, ChatGPT, Cursor, and other AI tools using the Model Context Protocol.

## [Agent skills](https://docs.omni.co/developers/agent-skills)

Open-source agent skills that bring model building, querying, and content management into your development environment.