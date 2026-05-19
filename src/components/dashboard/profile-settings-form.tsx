"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ChangeEvent,
} from "react";
import { useLocale } from "next-intl";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
} from "@/components/ui";
import { PhoneInput } from "@/components/ui/phone-input";

type ProfileData = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
};

type EmailChangeStep = "idle" | "pending-code" | "done";

export function ProfileSettingsForm() {
  const locale = useLocale();
  const isAr = locale === "ar";

  // ── Profile state ──────────────────────────────────────────────────────────
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileMsg, setProfileMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [profilePending, setProfilePending] = useState(false);

  // ── Avatar upload ──────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadPending, setUploadPending] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // ── Email change ───────────────────────────────────────────────────────────
  const [newEmail, setNewEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailStep, setEmailStep] = useState<EmailChangeStep>("idle");
  const [emailMsg, setEmailMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [emailPending, setEmailPending] = useState(false);

  // ── Password change ────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passMsg, setPassMsg] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [passPending, setPassPending] = useState(false);

  // ── Load profile ───────────────────────────────────────────────────────────
  useEffect(() => {
    void fetch("/api/users/profile")
      .then((r) => r.json())
      .then((data: ProfileData) => {
        setProfile(data);
        setFullName(data.fullName ?? "");
        setPhone(data.phone ?? "");
        setAvatarUrl(data.avatarUrl ?? "");
        setPreviewUrl(data.avatarUrl ?? null);
      });
  }, []);

  // ── Avatar upload ──────────────────────────────────────────────────────────
  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    setUploadPending(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload?folder=avatars", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as { url?: string; message?: string };
      if (!res.ok || !data.url) {
        setProfileMsg({
          ok: false,
          text: data.message ?? (isAr ? "فشل رفع الصورة" : "Upload failed"),
        });
        return;
      }
      setAvatarUrl(data.url);
      setProfileMsg({
        ok: true,
        text: isAr
          ? "تم رفع الصورة — اضغط حفظ لتطبيق التغيير"
          : "Image uploaded — click Save to apply",
      });
    } finally {
      setUploadPending(false);
    }
  }

  // ── Save profile (name + phone + avatarUrl) ────────────────────────────────
  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    setProfilePending(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim() || undefined,
          phone: phone.trim() || undefined,
          // email يتغير فقط عن طريق auth/email-change/request + confirm
          avatarUrl: avatarUrl || undefined,
        }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      setProfileMsg({
        ok: res.ok,
        text: res.ok
          ? isAr
            ? "تم حفظ الملف الشخصي بنجاح"
            : "Profile saved successfully"
          : typeof data.message === "string"
            ? data.message
            : isAr
              ? "تعذر الحفظ"
              : "Save failed",
      });
    } finally {
      setProfilePending(false);
    }
  }

  // ── Request email change ───────────────────────────────────────────────────
  async function handleRequestEmailChange(e: FormEvent) {
    e.preventDefault();
    setEmailMsg(null);
    setEmailPending(true);
    try {
      const res = await fetch("/api/auth/email-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: newEmail.trim().toLowerCase() }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        setEmailMsg({
          ok: false,
          text:
            typeof data.message === "string"
              ? data.message
              : isAr
                ? "حدث خطأ"
                : "An error occurred",
        });
        return;
      }
      setEmailStep("pending-code");
      setEmailMsg({
        ok: true,
        text: isAr
          ? `تم إرسال كود التحقق إلى ${newEmail}`
          : `Verification code sent to ${newEmail}`,
      });
    } finally {
      setEmailPending(false);
    }
  }

  // ── Confirm email change ───────────────────────────────────────────────────
  async function handleConfirmEmailChange(e: FormEvent) {
    e.preventDefault();
    setEmailMsg(null);
    setEmailPending(true);
    try {
      const res = await fetch("/api/auth/email-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: emailCode }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        setEmailMsg({
          ok: false,
          text:
            typeof data.message === "string"
              ? data.message
              : isAr
                ? "الكود غير صحيح"
                : "Invalid code",
        });
        return;
      }
      setEmailStep("done");
      if (profile)
        setProfile({
          ...profile,
          email: typeof data.email === "string" ? data.email : newEmail,
        });
      setEmailMsg({
        ok: true,
        text: isAr
          ? "تم تحديث البريد الإلكتروني بنجاح"
          : "Email updated successfully",
      });
      setNewEmail("");
      setEmailCode("");
    } finally {
      setEmailPending(false);
    }
  }

  // ── Change password ────────────────────────────────────────────────────────
  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPassMsg(null);
    if (newPassword !== confirmPassword) {
      setPassMsg({
        ok: false,
        text: isAr ? "كلمتا المرور غير متطابقتين" : "Passwords do not match",
      });
      return;
    }
    setPassPending(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      setPassMsg({
        ok: res.ok,
        text: res.ok
          ? isAr
            ? "تم تغيير كلمة المرور بنجاح"
            : "Password changed successfully"
          : typeof data.message === "string"
            ? data.message
            : isAr
              ? "كلمة المرور الحالية غير صحيحة"
              : "Current password is incorrect",
      });
      if (res.ok) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } finally {
      setPassPending(false);
    }
  }

  const avatarInitials = (fullName || profile?.fullName || "U")
    .charAt(0)
    .toUpperCase();

  return (
    <div className="space-y-5">
      {/* ── Profile Info ── */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">
            {isAr ? "الملف الشخصي" : "Profile"}
          </h2>
          <p className="text-xs text-muted mt-0.5">
            {isAr
              ? "الاسم والهاتف وصورة الملف الشخصي"
              : "Name, phone number and profile picture"}
          </p>
        </CardHeader>
        <CardBody>
          <form
            onSubmit={(e) => void handleSaveProfile(e)}
            className="space-y-5"
          >
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-primary/20 bg-surface flex items-center justify-center">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt="avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-primary">
                      {avatarInitials}
                    </span>
                  )}
                </div>
                {uploadPending && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                    <svg
                      className="animate-spin text-white"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray="40"
                        strokeDashoffset="20"
                      />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadPending}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2 disabled:opacity-50 transition-colors"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {isAr ? "رفع صورة" : "Upload photo"}
                </button>
                <p className="text-xs text-muted">
                  {isAr
                    ? "JPG أو PNG أو WEBP — أقل من 5MB"
                    : "JPG, PNG or WEBP — max 5MB"}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => void handleAvatarChange(e)}
                />
              </div>
            </div>

            <Input
              label={isAr ? "الاسم الكامل" : "Full Name"}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <PhoneInput
              label={isAr ? "رقم الهاتف" : "Phone Number"}
              value={phone}
              onChange={setPhone}
              locale={locale}
            />

            {/* Current email display */}
            {profile?.email && (
              <div className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-muted flex items-center gap-2">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 text-primary"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span className="text-foreground font-medium">
                  {profile.email}
                </span>
              </div>
            )}

            {profileMsg && (
              <Alert variant={profileMsg.ok ? "success" : "error"}>
                {profileMsg.text}
              </Alert>
            )}

            <Button type="submit" loading={profilePending}>
              {isAr ? "حفظ الملف الشخصي" : "Save Profile"}
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* ── Email Change ── */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">
            {isAr ? "تغيير البريد الإلكتروني" : "Change Email"}
          </h2>
          <p className="text-xs text-muted mt-0.5">
            {isAr
              ? "سيتم إرسال كود تحقق على البريد الجديد"
              : "A verification code will be sent to the new email"}
          </p>
        </CardHeader>
        <CardBody>
          {emailStep === "done" ? (
            <Alert variant="success">
              {isAr
                ? "✓ تم تحديث البريد الإلكتروني بنجاح"
                : "✓ Email updated successfully"}
            </Alert>
          ) : emailStep === "idle" ? (
            <form
              onSubmit={(e) => void handleRequestEmailChange(e)}
              className="space-y-4"
            >
              <Input
                label={isAr ? "البريد الإلكتروني الجديد" : "New Email Address"}
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new@email.com"
              />
              {emailMsg && (
                <Alert variant={emailMsg.ok ? "success" : "error"}>
                  {emailMsg.text}
                </Alert>
              )}
              <Button type="submit" loading={emailPending}>
                {isAr ? "إرسال كود التحقق" : "Send Verification Code"}
              </Button>
            </form>
          ) : (
            <form
              onSubmit={(e) => void handleConfirmEmailChange(e)}
              className="space-y-4"
            >
              {emailMsg && <Alert variant="success">{emailMsg.text}</Alert>}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  {isAr
                    ? "كود التحقق (6 أرقام)"
                    : "Verification Code (6 digits)"}
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  minLength={6}
                  value={emailCode}
                  onChange={(e) =>
                    setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000000"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-center text-lg font-mono tracking-widest text-foreground outline-none ring-primary/30 focus:ring-2 transition-shadow"
                  dir="ltr"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" loading={emailPending}>
                  {isAr ? "تأكيد التغيير" : "Confirm Change"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEmailStep("idle");
                    setEmailMsg(null);
                    setEmailCode("");
                  }}
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </Button>
              </div>
            </form>
          )}
        </CardBody>
      </Card>

      {/* ── Change Password ── */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">
            {isAr ? "تغيير كلمة المرور" : "Change Password"}
          </h2>
        </CardHeader>
        <CardBody>
          <form
            onSubmit={(e) => void handleChangePassword(e)}
            className="space-y-4"
          >
            <Input
              label={isAr ? "كلمة المرور الحالية" : "Current Password"}
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Input
              label={isAr ? "كلمة المرور الجديدة" : "New Password"}
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              label={
                isAr ? "تأكيد كلمة المرور الجديدة" : "Confirm New Password"
              }
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {passMsg && (
              <Alert variant={passMsg.ok ? "success" : "error"}>
                {passMsg.text}
              </Alert>
            )}
            <Button type="submit" loading={passPending}>
              {isAr ? "تغيير كلمة المرور" : "Change Password"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
