import { proxyToBackend } from "@/lib/api/proxy";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  return proxyToBackend(request, {
    path: "/api/audit-logs",
    method: "GET",
    forwardQuery: true,
  });
}
