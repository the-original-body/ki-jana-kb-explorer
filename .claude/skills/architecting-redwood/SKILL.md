---
name: architecting-redwood
description: |
  Design and validate architecture for RedwoodSDK applications on Cloudflare Workers.
  Use when creating PRDs, planning features, defining routes, or setting up server functions.
  Triggers: "designing redwood app", "planning routes", "server functions usage", "rsc patterns", "component structure".
allowed-tools: Read, Grep, Glob, WebSearch
---

# RedwoodSDK Architect

> Defines the immutable architectural laws for RedwoodSDK (RSC) on Cloudflare.

## 1. Context Injection (MANDATORY)
**Before** writing any PRD sections or code plans, you MUST read the specific reference files relevant to the user request to ground your reasoning.

*   **IF planning Routes or Layouts:**
    *   `Read("reference/routing-rules.md")` (Enforces `render` vs `layout` distinction).
*   **IF planning Data Access/Backend:**
    *   `Read("reference/server-functions.md")` (Enforces `use server` boundaries).
*   **IF debugging or setting up Config:**
    *   `Read("reference/configuration-guardrails.md")` (Enforces `nodejs_compat`).

## 2. Validation Protocol (The "Live-Check" Rule)
Your training data regarding RedwoodJS/RedwoodSDK may be outdated. You must verify **volatile** implementation details.

**Triggers for WebSearch:**
*   **Import Paths:** If you are unsure if a utility is in `rwsdk/client`, `@redwoodjs/web`, or `rwsdk/worker`.
*   **New Features:** If the user asks for features released after your knowledge cutoff (e.g., "OG Image generation", "Real-time").
*   **Syntax Errors:** If a suggested pattern fails, DO NOT GUESS. Search first.

**Action:**
> Use `WebSearch` querying `site:docs.rwsdk.com [feature_name]` or `site:github.com/redwoodjs/redwood [error_message]`.

## 3. Core Architecture Laws (Timeless)
These constraints are fundamental to the framework's design and DO NOT change.

### A. The HTML Shell vs. Layouts
*   **Law:** The `Document` component is the HTML shell. It MUST be rendered via `render(Document)`.
*   **Law:** UI wrappers (navbars, sidebars) MUST be rendered via `layout(MainLayout)`.
*   **Violation:** Wrapping `Document` inside `layout()` will break the app.

### B. Data Access Boundaries
*   **Law:** Client components (`"use client"`) CANNOT access the database directly.
*   **Law:** All DB operations must occur in files with `"use server"` at the top.
*   **Law:** Environment bindings (D1, KV, secrets) must be accessed via `import { env } from 'cloudflare:workers'`.

### C. Runtime Environment (V8 Isolate)
*   **Law:** The app runs on Cloudflare Workers (V8 Isolate), NOT Node.js.
*   **Law:** `fs`, `path`, and `child_process` are largely unavailable unless polyfilled via `nodejs_compat`.

## 4. Critical Anti-Patterns (NEVER DO)
*   **NEVER** suggest `wrangler dev` for local development. ALWAYS use `npm run dev` (Vite).
*   **NEVER** use `prisma` without explicitly configuring the D1 adapter.
*   **NEVER** assume standard React SPA patterns (like `react-router-dom`) apply here; RedwoodSDK uses a file-system + code-defined routing hybrid.
