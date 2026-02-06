# Critical Configuration Guardrails

## Wrangler Configuration (wrangler.jsonc)
*   **MUST** include `compatibility_flags: ["nodejs_compat"]` for React Server Components to work.
*   **MUST** point `main` to `src/worker.tsx`.
*   **MUST** use a compatibility date after `2024-09-23`.

## Vite Configuration (vite.config.ts)
*   **MUST** use the `@cloudflare/vite-plugin`.
*   **DO NOT** manually configure `resolve.conditions` or `ssr.external` (the plugin handles this).