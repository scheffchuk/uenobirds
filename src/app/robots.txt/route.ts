const BODY = ["User-agent: *", "Allow: /", "Disallow: /admin", ""].join("\n");

export function GET() {
  return new Response(BODY, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
