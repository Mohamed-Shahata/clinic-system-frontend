export async function proxyToBackend(
  input: string | URL,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetch(input, { ...init, cache: init?.cache ?? "no-store" });
  } catch {
    return new Response(JSON.stringify({ message: "Cannot reach API server" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
