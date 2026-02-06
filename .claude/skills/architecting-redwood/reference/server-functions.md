# Server Functions & Data Access Patterns

## The "use server" Directive
All database operations must occur within files marked with `"use server"` at the top.
*   **Scope:** These functions run strictly in the Cloudflare Worker environment.
*   **Client Usage:** They can be imported and called directly from Client Components (`"use client"`).

## Accessing Context (Bindings)
**DEPRECATED:** Never use `getContext()` from `rwsdk/worker`. It is outdated and unsafe [4].

**REQUIRED:** Import `env` from `cloudflare:workers` module for accessing Cloudflare bindings.

### Correct Pattern
```typescript
"use server";

import { env } from 'cloudflare:workers';
import type { Env } from '../worker';

export async function getItems() {
  // Cast env to typed interface for better IDE support
  const typedEnv = env as Env;

  // Use .bind() for parameters to prevent injection
  const result = await typedEnv.DB.prepare("SELECT * FROM items WHERE active = ?")
    .bind(1)
    .all();

  return result.results;
}
