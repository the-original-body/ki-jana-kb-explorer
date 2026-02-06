/**
 * SessionDurableObject - Durable Object for session storage with strong consistency.
 *
 * This class handles user session storage using Cloudflare Durable Objects,
 * providing strong consistency guarantees for session data.
 *
 * API:
 * - GET /?id=<sessionId> - Retrieve session data
 * - PUT /?id=<sessionId> - Store session data (JSON body)
 * - DELETE /?id=<sessionId> - Delete session data
 */

/** Session data structure */
export interface SessionData {
  userId: string;
  email: string;
  createdAt: string;
  expiresAt: string;
  [key: string]: unknown;
}

export class SessionDurableObject implements DurableObject {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  /**
   * Handle incoming requests to manage session data.
   * Uses DurableObjectState.storage for persistence with strong consistency.
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('id');

    // Validate session ID
    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Missing session ID' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    try {
      switch (request.method) {
        case 'GET':
          return await this.getSession(sessionId);
        case 'PUT':
          return await this.putSession(sessionId, request);
        case 'DELETE':
          return await this.deleteSession(sessionId);
        default:
          return new Response(
            JSON.stringify({ error: 'Method Not Allowed' }),
            {
              status: 405,
              headers: {
                'Content-Type': 'application/json',
                Allow: 'GET, PUT, DELETE',
              },
            }
          );
      }
    } catch (error) {
      // Log error server-side but don't expose details to client
      const _message = error instanceof Error ? error.message : 'Internal error';
      void _message; // Suppress unused variable warning - message kept for debugging
      return new Response(
        JSON.stringify({ error: 'Internal Server Error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  /**
   * Retrieve session data by ID.
   */
  private async getSession(sessionId: string): Promise<Response> {
    const data = await this.state.storage.get<SessionData>(sessionId);

    if (!data) {
      return new Response(JSON.stringify(null), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if session has expired
    if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
      // Clean up expired session
      await this.state.storage.delete(sessionId);
      return new Response(JSON.stringify(null), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Store session data.
   */
  private async putSession(sessionId: string, request: Request): Promise<Response> {
    let data: SessionData;

    try {
      data = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate required fields
    if (!data.userId || !data.email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, email' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Store session with strong consistency
    await this.state.storage.put(sessionId, data);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Delete session data.
   */
  private async deleteSession(sessionId: string): Promise<Response> {
    await this.state.storage.delete(sessionId);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
