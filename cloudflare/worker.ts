export type Env = Record<string, unknown>;

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return new Response("ok", { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } });
    }

    return new Response("shadowspark-production worker placeholder", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
};
