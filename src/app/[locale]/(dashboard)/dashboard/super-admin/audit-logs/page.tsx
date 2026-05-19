import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { getBackendBaseUrl } from "@/lib/backend-url";

type AuditLog = {
  id: string;
  clinicId?: string | null;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  createdAt: string;
  clinic?: { id: string; name: string } | null;
};

async function fetchAuditLogs(token: string, query: URLSearchParams) {
  query.set("limit", query.get("limit") ?? "50");
  const res = await fetch(`${getBackendBaseUrl()}/api/audit-logs?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return { data: [], total: 0, page: 1 };
  return res.json() as Promise<{ data: AuditLog[]; total: number; page: number }>;
}

export default async function AuditLogsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const session = await getSessionFromCookies();
  if (!session?.isSuperAdmin) redirect(`/${locale}/login`);

  const jar = await cookies();
  const token = jar.get("access_token")?.value ?? "";
  const filters = await searchParams;
  const query = new URLSearchParams();
  for (const key of ["clinicId", "action", "entityType", "from", "to", "page"]) {
    const value = filters[key];
    if (typeof value === "string" && value) query.set(key, value);
  }
  const logs = await fetchAuditLogs(token, query);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {isAr ? "سجل التدقيق" : "Audit Logs"}
        </h1>
        <p className="text-sm text-muted mt-0.5">
          {isAr ? "مراجعة نشاط المنصة والعيادات" : "Review platform and clinic activity"}
        </p>
      </div>

      <form className="grid gap-3 rounded-lg border border-card-border bg-card p-4 md:grid-cols-5">
        <input name="from" type="date" className="rounded border border-border bg-surface px-3 py-2 text-sm" />
        <input name="to" type="date" className="rounded border border-border bg-surface px-3 py-2 text-sm" />
        <input name="action" placeholder={isAr ? "الإجراء" : "Action"} className="rounded border border-border bg-surface px-3 py-2 text-sm" />
        <input name="clinicId" placeholder={isAr ? "العيادة" : "Clinic ID"} className="rounded border border-border bg-surface px-3 py-2 text-sm" />
        <button className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          {isAr ? "تصفية" : "Filter"}
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-card-border bg-card">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-surface-2 text-xs text-muted">
            <tr>
              <th className="px-4 py-3 text-start">{isAr ? "الوقت" : "Date/time"}</th>
              <th className="px-4 py-3 text-start">{isAr ? "العيادة" : "Clinic"}</th>
              <th className="px-4 py-3 text-start">{isAr ? "المستخدم" : "Actor"}</th>
              <th className="px-4 py-3 text-start">{isAr ? "الإجراء" : "Action"}</th>
              <th className="px-4 py-3 text-start">{isAr ? "النوع" : "Entity type"}</th>
              <th className="px-4 py-3 text-start">{isAr ? "المعرف" : "Entity ID"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border">
            {logs.data.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-3">{new Date(log.createdAt).toLocaleString(isAr ? "ar-EG" : "en-GB")}</td>
                <td className="px-4 py-3">{log.clinic?.name ?? log.clinicId ?? "-"}</td>
                <td className="px-4 py-3 font-mono text-xs">{log.actorId ?? "-"}</td>
                <td className="px-4 py-3">{log.action}</td>
                <td className="px-4 py-3">{log.entityType}</td>
                <td className="px-4 py-3 font-mono text-xs">{log.entityId ?? "-"}</td>
              </tr>
            ))}
            {logs.data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  {isAr ? "لا توجد سجلات." : "No audit logs found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
