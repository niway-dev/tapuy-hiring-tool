/**
 * Fetch wrapper that uses Cloudflare Service Bindings in production
 * and falls back to regular fetch() in local development.
 *
 * Service Bindings allow direct Worker-to-Worker communication
 * without going through public DNS (which breaks on *.workers.dev).
 */
export async function apiFetch(request: Request | string, init?: RequestInit): Promise<Response> {
  const req = request instanceof Request ? request : new Request(request, init);

  try {
    // In Cloudflare Workers, "cloudflare:workers" provides access to bindings
    const { env } = await import("cloudflare:workers");
    if (env.API_SERVICE) {
      return env.API_SERVICE.fetch(req);
    }
  } catch {
    // cloudflare:workers not available (local dev), fall through to fetch()
  }

  return fetch(req);
}
