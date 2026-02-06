/**
 * Type declarations for rwsdk (RedwoodSDK)
 *
 * These declarations provide TypeScript types for the RedwoodJS SDK
 * used in this Cloudflare Workers template.
 */

declare module 'rwsdk/worker' {
  import type { ReactNode } from 'react';

  export interface RouteContext {
    request: Request;
    env: unknown;
    ctx?: ExecutionContext;
  }

  export type RouteHandler = (context: RouteContext) => Response | Promise<Response> | ReactNode;

  export type RouteDefinition = unknown;

  export interface AppDefinition {
    fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function defineApp(routes: any[]): AppDefinition;

  export class ErrorResponse extends Response {
    constructor(status: number, message: string);
  }
}

declare module 'rwsdk/router' {
  import type { ReactNode, ComponentType } from 'react';

  export interface RouteContext {
    request: Request;
    env: unknown;
    ctx?: ExecutionContext;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type RouteHandler =
    | ComponentType<unknown>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | ((context: any) => Response | Promise<Response> | ReactNode);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function route(path: string, handler: any): unknown;

  export function render(
    Document: ComponentType<{ children: ReactNode }>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    routes: any[]
  ): unknown;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function prefix(path: string, routes: any[]): unknown;
}
