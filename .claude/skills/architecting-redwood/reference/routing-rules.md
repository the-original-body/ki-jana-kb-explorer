# RedwoodSDK Routing Rules

## The `render()` vs `layout()` Distinction
In RedwoodSDK, the distinction between the HTML shell and the routing layout is critical and enforced by the runtime.

### 1. The HTML Shell (`render`)
*   **Purpose:** Renders the root `Document` component (html, head, body).
*   **Rule:** Must be used exactly **ONCE** per application entry point.
*   **Syntax:** `render(Document, [ children ])`
*   **Violation:** Using `layout(Document)` causes the HTML shell to fail rendering [2].

### 2. Inner Layouts (`layout`)
*   **Purpose:** Renders shared UI (Navbars, Sidebars) inside the body.
*   **Rule:** Can be nested infinitely.
*   **Syntax:** `layout(MainLayout, [ children ])`

## Correct Entry Point Structure (src/worker.tsx)
The hierarchy must always follow this order:
1. `defineApp`
2. `render(Document)` (The Shell)
3. `layout(MainLayout)` (The UI Wrapper)
4. Routes

## Handling Assets
*   Do not manually import CSS in the Worker.
*   Import global CSS in `src/entry.client.tsx` or the top-level layout component to ensure Vite processes it correctly [3].
