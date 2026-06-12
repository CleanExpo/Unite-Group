---
title: "GPT-5.5 Model | OpenAI API"
source: "https://developers.openai.com/api/docs/models/gpt-5.5"
author:
published:
created: 2026-05-15
description:
tags:
  - "clippings"
---
![gpt-5.5](https://developers.openai.com/images/api/models/icons/gpt-5.5.png)

GPT-5.5

Default

A new class of intelligence for coding and professional work.

Reasoning

Highest

Speed

Fast

Price

$5 • $30

Input• Output

Input

Text, image

Output

Text

GPT-5.5 is our newest frontier model for the most complex professional work. Learn more in our [latest model guide](https://developers.openai.com/api/docs/guides/latest-model). Reasoning.effort supports: none, low, medium (default), high and xhigh.

1,050,000 context window

128,000 max output tokens

Dec 01, 2025 knowledge cutoff

Reasoning token support

Pricing

Pricing is based on the number of tokens used, or other metrics based on the model type. For tool-specific models, like search and computer use, there’s a fee per tool call. See details in the [pricing page](https://developers.openai.com/api/docs/pricing).

Text tokens

Per 1M tokens

∙

Batch API price

Input

$5.00

Cached input

$0.50

Output

$30.00

Quick comparison

Input

Cached input

Output

GPT-5.5

$5.00

GPT-5.4

$2.50

GPT-5.4 mini

$0.75

For GPT-5.5, prompts with >272K input tokens are priced at 2x input and 1.5x output for the full session for standard, batch, and flex.

Regional processing (data residency) endpoints are charged a 10% uplift for GPT-5.5.

Modalities

Text

Input and output

Image

Input only

Audio

Not supported

Video

Not supported

Endpoints

Chat Completions

v1/chat/completions

Responses

v1/responses

Realtime

v1/realtime

Realtime translation

v1/realtime/translations

Realtime transcription

v1/realtime/transcription\_sessions

Assistants

v1/assistants

Batch

v1/batch

Fine-tuning

v1/fine-tuning

Embeddings

v1/embeddings

Image generation

v1/images/generations

Videos

v1/videos

Image edit

v1/images/edits

Speech generation

v1/audio/speech

Transcription

v1/audio/transcriptions

Translation

v1/audio/translations

Moderation

v1/moderations

Completions (legacy)

v1/completions

Features

Streaming

Supported

Function calling

Supported

Structured outputs

Supported

Fine-tuning

Not supported

Tools

Tools supported by this model when using the Responses API.

Web search

Supported

File search

Supported

Image generation

Supported

Code interpreter

Supported

Hosted shell

Supported

Apply patch

Supported

Skills

Supported

Computer use

Supported

MCP

Supported

Tool search

Supported

Snapshots

Snapshots let you lock in a specific version of the model so that performance and behavior remain consistent. Below is a list of all available snapshots and aliases for GPT-5.5.

![gpt-5.5](https://developers.openai.com/images/api/models/icons/gpt-5.5.png)

gpt-5.5

gpt-5.5-2026-04-23

gpt-5.5-2026-04-23

Rate limits

Rate limits ensure fair and reliable access to the API by placing specific caps on requests, tokens, audio duration, or other usage within a given time period. Your usage tier determines how high these limits are set and automatically increases as you send more requests and spend more on the API.

<table><thead><tr><th>Tier</th><th>RPM</th><th>TPM</th><th>Batch queue limit</th></tr></thead><tbody><tr><td>Free</td><td colspan="3">Not supported</td></tr><tr><td>Tier 1</td><td>500</td><td>500,000</td><td>1,500,000</td></tr><tr><td>Tier 2</td><td>5,000</td><td>1,000,000</td><td>3,000,000</td></tr><tr><td>Tier 3</td><td>5,000</td><td>2,000,000</td><td>100,000,000</td></tr><tr><td>Tier 4</td><td>10,000</td><td>4,000,000</td><td>200,000,000</td></tr><tr><td>Tier 5</td><td>15,000</td><td>40,000,000</td><td>15,000,000,000</td></tr></tbody></table>