import { createFileRoute } from "@tanstack/react-router";
import { env } from "@/env/server";
import { apiFetch } from "@/lib/api-fetch";

/**
 * Proxy handler that forwards auth requests to the backend API.
 *
 * Uses Cloudflare Service Bindings in production for direct Worker-to-Worker
 * communication, and regular fetch() in local development.
 */
async function proxyToBackend(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const targetUrl = `${env.VITE_SERVER_URL}${url.pathname}${url.search}`;

    const proxiedRequest = new Request(targetUrl, request);
    proxiedRequest.headers.set("x-forwarded-host", url.host);
    proxiedRequest.headers.set("x-forwarded-proto", url.protocol.replace(":", ""));

    const response = await apiFetch(proxiedRequest);

    const responseHeaders = new Headers(response.headers);

    // Rewrite Set-Cookie headers: remove backend domain so the browser
    // assigns cookies to the client domain instead
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
    console.error("[auth-proxy] ERROR:", error instanceof Error ? error.message : error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export const Route = createFileRoute("/api/auth/$")({
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
