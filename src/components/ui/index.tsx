"use client";

import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  forwardRef,
} from "react";
import { useEffect } from "react";

/* ── Button ── */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-fg hover:opacity-90 shadow-glow/20",
  secondary:
    "bg-surface-2 text-foreground border border-border hover:bg-border/60",
  ghost: "text-foreground hover:bg-surface-2",
  danger: "bg-danger text-white hover:opacity-90",
  success: "bg-success text-white hover:opacity-90",
};
const sizeClass: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-base gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading,
      icon,
      children,
      className = "",
      disabled,
      ...rest
    },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center font-medium rounded transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-50 disabled:cursor-not-allowed",
        variantClass[variant],
        sizeClass[size],
        className,
      ].join(" ")}
      {...rest}
    >
      {loading ? <Spinner size={size === "sm" ? 14 : 16} /> : icon}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

/* ── Input ── */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, className = "", id, ...rest }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            "w-full rounded border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted",
            "outline-none ring-primary/30 focus:ring-2 transition-shadow",
            error ? "border-danger" : "border-border",
            className,
          ].join(" ")}
          {...rest}
        />
        {hint && !error && <p className="text-xs text-muted">{hint}</p>}
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";

/* ── Card ── */
interface CardProps {
  children: ReactNode;
  className?: string;
}
export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={[
        "bg-card border border-card-border rounded-lg shadow-card",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: CardProps) {
  return (
    <div
      className={["px-5 py-4 border-b border-card-border", className].join(" ")}
    >
      {children}
    </div>
  );
}

export function CardBody({ children, className = "" }: CardProps) {
  return <div className={["px-5 py-4", className].join(" ")}>{children}</div>;
}

/* ── Badge ── */
type BadgeVariant = "default" | "success" | "warning" | "danger" | "muted";
interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
}
const badgeVariant: Record<BadgeVariant, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  muted: "bg-surface-2 text-muted",
};
export function Badge({ children, variant = "default" }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        badgeVariant[variant],
      ].join(" ")}
    >
      {children}
    </span>
  );
}

/* ── Stat Card ── */
interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  sub?: string;
  color?: "primary" | "success" | "warning";
}
const statColor: Record<string, string> = {
  primary: "text-primary bg-primary/10",
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
};
export function StatCard({
  label,
  value,
  icon,
  sub,
  color = "primary",
}: StatCardProps) {
  return (
    <Card>
      <CardBody className="flex items-start gap-4">
        <div className={["p-2.5 rounded-lg", statColor[color]].join(" ")}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted truncate">{label}</p>
          <p className="text-2xl font-semibold text-foreground mt-0.5">
            {value}
          </p>
          {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
        </div>
      </CardBody>
    </Card>
  );
}

/* ── Spinner ── */
export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="40"
        strokeDashoffset="20"
      />
    </svg>
  );
}

// Re-export toast components
export { ToastProvider, useToast } from "./toast";

/* ── Empty state ── */
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}
export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      {icon && <div className="text-muted/50 mb-1">{icon}</div>}
      <p className="font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-sm text-muted max-w-xs">{description}</p>
      )}
      {action}
    </div>
  );
}

/* ── Alert ── */
type AlertVariant = "info" | "success" | "warning" | "error";
interface AlertProps {
  variant?: AlertVariant;
  children: ReactNode;
}
const alertStyle: Record<AlertVariant, string> = {
  info: "bg-primary/8 border-primary/20 text-primary",
  success: "bg-success/8 border-success/20 text-success",
  warning: "bg-warning/8 border-warning/20 text-warning",
  error: "bg-danger/8  border-danger/20  text-danger",
};
export function Alert({ variant = "info", children }: AlertProps) {
  return (
    <div
      className={[
        "flex gap-2 rounded border p-3 text-sm",
        alertStyle[variant],
      ].join(" ")}
    >
      {children}
    </div>
  );
}

/* ── Modal ── */
interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  closeLabel?: string;
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  className = "",
  closeLabel = "Close",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={[
          "w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-card-border bg-card shadow-card-md",
          className,
        ].join(" ")}
      >
        <div className="border-b border-card-border px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {title}
              </h2>
              {description && (
                <p className="mt-1 text-sm text-muted">{description}</p>
              )}
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              {closeLabel}
            </Button>
          </div>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
