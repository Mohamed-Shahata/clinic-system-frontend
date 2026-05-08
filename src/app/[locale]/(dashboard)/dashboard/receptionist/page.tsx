import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { getBackendBaseUrl } from "@/lib/backend-url";
import { StatCard, Card, CardBody, CardHeader, Badge } from "@/components/ui";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

type Patient = {
  id: string;
  code: string;
  fullName: string;
  phone?: string;
  createdAt: string;
};

type Appointment = {
  id: string;
  startsAt: string;
  status: string;
  patient: { fullName: string; code: string };
  doctor: { fullName: string };
};

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function api<T>(token: string, path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${getBackendBaseUrl()}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return fallback;
    return res.json() as Promise<T>;
  } catch {
    return fallback;
  }
}

export default async function ReceptionistPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const t = await getTranslations("dashboard.reception");
  const session = await getSessionFromCookies();
  if (session?.role !== "RECEPTIONIST") redirect(`/${locale}/login`);

  const jar = await cookies();
  const token = jar.get("access_token")?.value ?? "";

  const [patients, appointments] = await Promise.all([
    api<Patient[]>(token, "/api/patients", []),
    api<Appointment[]>(token, "/api/appointments", []),
  ]);

  const now = new Date();
  const todayStr = dateInputValue(now);

  const todayPatients = patients.filter((p) => {
    return dateInputValue(new Date(p.createdAt)) === todayStr;
  });

  const todayAppointments = appointments.filter(
    (a) => dateInputValue(new Date(a.startsAt)) === todayStr,
  );

  const waiting = todayAppointments.filter((a) => a.status === "BOOKED").length;
  const inProgress = todayAppointments.filter(
    (a) => a.status === "IN_PROGRESS",
  ).length;
  const completed = todayAppointments.filter(
    (a) => a.status === "COMPLETED",
  ).length;

  const today = now.toLocaleDateString(isAr ? "ar-EG" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const nextAppointments = todayAppointments
    .filter((a) => a.status === "BOOKED")
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted uppercase tracking-wide">{today}</p>
        <h1 className="text-xl font-semibold text-foreground mt-0.5">
          {t("title")}
        </h1>
        <p className="text-sm text-muted">{session.clinicName}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label={t("registeredToday")}
          value={todayPatients.length}
          color="success"
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M20 8v6" />
              <path d="M23 11h-6" />
            </svg>
          }
        />
        <StatCard
          label={t("totalPatients")}
          value={patients.length}
          color="primary"
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            </svg>
          }
        />
        <StatCard
          label={t("waiting")}
          value={waiting}
          color="warning"
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
        <StatCard
          label={t("completedToday")}
          value={completed}
          color="success"
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
        />
      </div>

      {/* Queue status bar */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">
            {t("queueToday")}
          </h2>
        </CardHeader>
        <CardBody className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-2xl font-bold text-yellow-600">{waiting}</p>
            <p className="text-xs text-muted mt-1">
              {t("waiting")}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-2xl font-bold text-blue-600">{inProgress}</p>
            <p className="text-xs text-muted mt-1">
              {t("inProgress")}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-2xl font-bold text-green-600">{completed}</p>
            <p className="text-xs text-muted mt-1">
              {t("completed")}
            </p>
          </div>
        </CardBody>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Next appointments in queue */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {t("nextAppointments")}
              </h2>
              <Link
                href={`/${locale}/dashboard/receptionist/appointments`}
                className="text-xs text-primary hover:underline"
              >
                {t("viewAll")}
              </Link>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {nextAppointments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">
                {t("noWaitingToday")}
              </p>
            ) : (
              <div className="divide-y divide-card-border">
                {nextAppointments.map((a) => (
                  <div
                    key={a.id}
                    className="px-5 py-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {a.patient.fullName}
                      </p>
                      <p className="text-xs text-muted">
                        {a.doctor.fullName} ·{" "}
                        {new Date(a.startsAt).toLocaleTimeString(
                          isAr ? "ar-EG" : "en-GB",
                          { hour: "2-digit", minute: "2-digit", hour12: isAr },
                        )}
                      </p>
                    </div>
                    <Badge variant="default">
                      {t("badgeWaiting")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Recently registered patients */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {t("registeredTodaySection")}
              </h2>
              <Link
                href={`/${locale}/dashboard/receptionist/patients`}
                className="text-xs text-primary hover:underline"
              >
                {t("allPatientsLink")}
              </Link>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {todayPatients.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">
                {t("noPatientsToday")}
              </p>
            ) : (
              <div className="divide-y divide-card-border">
                {todayPatients.slice(0, 6).map((p) => (
                  <div
                    key={p.id}
                    className="px-5 py-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {p.fullName}
                      </p>
                      <p className="text-xs text-muted font-mono">{p.code}</p>
                    </div>
                    <Badge variant="success">{t("badgeNew")}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
