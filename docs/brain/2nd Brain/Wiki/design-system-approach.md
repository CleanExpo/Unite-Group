---
updated: 2026-05-08

# Design & Prototyping Tools

## Overview

This section details the industry-standard tools used for wireframing, high-fidelity mockups, and interactive prototyping. While 2D tools remain foundational, the industry is rapidly adopting 3D space, AI integration, standardized markdown specifications, and hosting services to create more immersive and realistic user experiences. Google's open-source `DESIGN.md` specification now provides a shared, human-readable format for design systems to ensure consistency across AI agents.

## 🛠️ Core 2D Design Tools

These tools are the industry standard for creating structured, pixel-perfect, and scalable user interfaces.

*   **Figma:** Cloud-based vector editor known for its collaborative real-time editing capabilities. Ideal for team-based design sprints and rapid iteration.
*   **Sketch:** A long-standing vector-based design tool, favored for its simplicity and robust plugin ecosystem.
*   **Adobe XD:** Adobe's solution for UI/UX design, integrating well within the Adobe Creative Cloud suite.

## 🚀 Advanced Prototyping & 3D Design

As interfaces become more complex, designers are moving beyond flat screens to incorporate depth, physics, spatial interaction, and dynamic media integration.

### 🌐 Emerging 3D Prototyping Workflows

The ability to prototype in three dimensions (X, Y, Z axes) is revolutionizing how we design for AR/VR, complex product interfaces, and immersive web experiences. Advanced workflows now integrate AI, dedicated hosting, and standardized markdown specifications to create high-value, animated sites.

**Workflow Summary: From 2D Concept to 3D Prototype**

1.  **Conceptualization (2D):** Start with standard tools (Figma) to map out the core user flow and information architecture.
2.  **Resource Gathering:** Capture initial visual resources (e.g., video frames) and upload them to a dedicated hosting service (e.g., HostGator) to generate stable URLs. Provide screenshots and HTML references to give AI tools necessary visual context.
3.  **AI Structuring:** Use specialized AI tools (e.g., Gemini, Google AI Studio) alongside a `DESIGN.md` specification and the captured resources to generate a comprehensive, functional prompt and initial website structure. Markdown serves as the ideal middle layer for AI, structuring tokens, colors, typography, elevations, shapes, and dos/donts better than plain text or JSON.
4.  **Modeling (3D) & Asset Generation:** Transfer core elements into a 3D environment (e.g., Spline) or use visual AI agents (e.g., [[Neuform]], [[Stitch]]) to remix and generate consistent sections. Designers build the physical space, objects, and interactive components.
5.  **Interaction Design:** Define how the user navigates the 3D space—does the screen rotate? Does the object slide out? This defines the *spatial* interaction.
6.  **Refinement & Output:** Implement advanced features like scroll-linked video effects and local code adjustments using tools like Antigravity or [[Cursor]], exporting a highly navigable, web-based 3D experience. Full landing pages can also be built by bringing HTML and the `DESIGN.md` file into builders like [[Claude Design]] or [[Aura]].

### 💡 Key 3D & AI Tools

*   **Spline:** A tool for creating 3D scenes and interactive web experiences.
*   **Gemini/AI Models:** Used for generating initial site structures and complex prompts based on visual input.
*   **AI Design Generators:** [[Neuform]], [[Stitch]], and [[Variant]] generate and visually remix designs while adhering to markdown specifications.
*   **AI Web Builders:** [[Claude Design]] and [[Aura]] build full applications and landing pages using HTML and `DESIGN.md` inputs.
*   **Specification Repositories:** `getdesign.md` provides downloadable `DESIGN.md` files generated from popular real-world design systems.
*   **Hosting Services:** Essential for hosting media and ensuring stable URLs for dynamic content.
*   **Code Editors (e.g., VS Code, [[Cursor]]):** Necessary for fine-tuning and implementing advanced web interactions.

## 💡 Advanced Workflow Steps:
1. **Capture:** Capture visual assets (video, images) and upload them to a hosting service.
2. **Prompt:** Use AI models to generate the foundational structure and necessary code prompts, referencing the hosted assets and a shared `DESIGN.md` standard.
3. **Build:** Use 3D/Web tools to build the interactive experience, integrating the hosted media and refining the code.

***

## 🚀 Best Practices for Advanced Web Design:
* **Media Hosting:** Always host large media files externally to ensure reliable loading speeds.
* **AI Integration:** Leverage AI not just for ideas, but for generating structured, usable code snippets. Ensure AI agents share the same design system requirements by applying a unified `DESIGN.md` file across platforms.
* **Iterative Design:** Start with a `DESIGN.md` spec $\rightarrow$ Reinforce with visual context (screenshots, HTML) $\rightarrow$ Generate and curate sections $\rightarrow$ Finish the site. <!-- updated 2026-05-08: previously said Treat the process as a loop: AI \rightarrow Draft \rightarrow Test \rightarrow Refine. -->

***

## 🎨 Design Principles:
* **Immersive Experience:** Focus on depth, motion, and interactivity over static content.
* **Performance:** Optimize all assets to ensure fast loading times, especially for media-heavy sites.
* **Clarity:** Even complex interactions must guide the user clearly through the experience.
* **Standardization:** Maintain cross-platform consistency by codifying design tokens, typography, and rules into human- and AI-readable markdown.

***

## 🛠️ Tools & Resources:
* **3D Modeling:** Blender, Spline
* **Web Frameworks:** React, Three.js
* **AI Assistants & Generators:** Gemini, ChatGPT, [[Neuform]], [[Stitch]], [[Variant]]
* **AI Builders:** [[Claude Design]], [[Aura]]
* **Code Editors:** VS Code, [[Cursor]]
* **Design Systems:** Google `DESIGN.md` Spec, `getdesign.md`, `github.com/VoltAgent/awesome-design-md` (70k★ community repo of pre-built DESIGN.md files for Linear, Stripe, Notion, Vercel — drop straight into a repo's `.claude/DESIGN.md`), `github.com/google-labs-code/design.md` (lint CLI; runs in CI to catch contrast bugs + orphan tokens)

## 📊 Slides as Branded Deliverable

`Sources/Claude HTML Slides = The NEW Powerpoint Killer (Full Tutorial).md` — Zara Zhang's `zarazhang/frontend-slides` skill turns any Claude Code project into branded HTML decks. Three-level pattern: (L1) install skill, generate vanilla deck; (L2) feed DESIGN.md + brand book → on-brand deck; (L3) custom animated components (radar charts, iPhone mockups, currency-flow tickers). Demonstrated mocks: Anthropic, Apple, Figma, Spotify, Uber, Wise. Press F11 for full-screen presenter mode, arrow keys to advance. Compounds the DESIGN.md investment — every Margot research output and ceo-board memo can ship as an animated HTML slide deck instead of PDF. See [[system-opportunities-2026-05-11]] for adoption plan.

***

## 🧠 Mindset:
* **Problem Solver:** Approach design as solving a technical or narrative problem.
* **Learner:** Be prepared to learn new coding or design paradigms constantly.
* **Curator:** Select and curate the best tools, techniques, and AI generations for the job, relying on strong visual references and personal taste.