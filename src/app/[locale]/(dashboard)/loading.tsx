/**
 * FRONT-05: Loading skeleton for the dashboard segment.
 * Without this, navigating between dashboard pages shows a blank screen
 * until the page's data fetching completes. Next.js shows this file
 * automatically during Suspense/page transitions.
 */
export default function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>
      </div>
    </div>
  );
}
