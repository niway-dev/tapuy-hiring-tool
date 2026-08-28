import { createFileRoute } from "@tanstack/react-router";
import { env } from "@/env/server";
import { apiFetch } from "@/lib/api-fetch";

/**
 * General API proxy that forwards /api/v1/* requests to the backend.
 *
 * This ensures the browser always talks to the web Worker domain,
 * so auth cookies (set on this domain) are included automatically.
 * The Service Binding routes requests directly to the API Worker.
 */
async function proxyToBackend(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const targetUrl = `${env.VITE_SERVER_URL}${url.pathname}${url.search}`;

    const proxiedRequest = new Request(targetUrl, request);

    const response = await apiFetch(proxiedRequest);

    const responseHeaders = new Headers(response.headers);

    // Rewrite Set-Cookie headers if the backend sets any
    const setCookies = response.headers.getSetCookie?.() ?? [];
    if (setCookies.length > 0) {
      responseHeaders.delete("set-cookie");
      for (const cookie of setCookies) {
        const rewritten = cookie.replace(/;\s*domain=[^;]*/gi, "");
        responseHeaders.append("set-cookie", rewritten);
      }
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[api-proxy] ERROR:", error instanceof Error ? error.message : error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export const Route = createFileRoute("/api/v1/$")({
  server: {
    handlers: {
      GET: async ({ request }) => proxyToBackend(request),
      POST: async ({ request }) => proxyToBackend(request),
      PUT: async ({ request }) => proxyToBackend(request),
      PATCH: async ({ request }) => proxyToBackend(request),
      DELETE: async ({ request }) => proxyToBackend(request),
    },
  },
});
