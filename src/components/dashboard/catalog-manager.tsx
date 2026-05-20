"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Modal,
} from "@/components/ui";

type Item = Record<string, string> & { id: string };

type CatalogKind = "medications" | "imaging" | "tests";

export function CatalogManager({ kind }: { kind: CatalogKind }) {
  const locale = useLocale();
  const t = useTranslations("dashboard.catalog");
  const [items, setItems] = useState<Item[]>([]);
  const [q, setQ] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [frequency, setFrequency] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    const res = await fetch(
      `/api/prescriptions/catalog/${kind}${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    );
    const data = await res.json().catch(() => []);
    setItems(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    void load();
  }, [kind, q]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await fetch(`/api/prescriptions/catalog/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          kind === "medications"
            ? { name, dose, frequency }
            : { name, category, notes },
        ),
      });
      setName("");
      setDose("");
      setFrequency("");
      setCategory("");
      setNotes("");
      setShowModal(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/prescriptions/catalog/${kind}/${id}`, {
        method: "DELETE",
      });
      await load();
    } finally {
      setDeletingId(null);
    }
  }

  const title =
    kind === "medications"
      ? t("medicationsTitle")
      : kind === "imaging"
        ? t("imagingTitle")
        : t("testsTitle");
  const createLabel =
    kind === "medications"
      ? t("addMedication")
      : kind === "imaging"
        ? t("addImaging")
        : t("addTest");
  const emptyMessage = t("empty");

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button type="button" onClick={() => setShowModal(true)}>
            {createLabel}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold">{t("catalogHeading")}</h3>
              <Input
                placeholder={t("filterPlaceholder")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="divide-y divide-card-border">
              {items.length > 0 ? (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 px-5 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted">
                        {kind === "medications"
                          ? [item.dose, item.frequency]
                              .filter(Boolean)
                              .join(" · ")
                          : item.category}
                      </p>
                      {item.notes && (
                        <p className="text-xs text-muted">{item.notes}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      disabled={deletingId === item.id}
                      onClick={() => void remove(item.id)}
                    >
                      {deletingId === item.id ? (
                        <svg
                          className="animate-spin"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      ) : (
                        t("delete")
                      )}
                    </Button>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-muted">
                  {emptyMessage}
                </p>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      <Modal
        open={showModal}
        title={createLabel}
        description={t("modalDesc")}
        onClose={() => setShowModal(false)}
        closeLabel={t("close")}
      >
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <Input
            label={t("name")}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {kind === "medications" ? (
            <>
              <Input
                label={t("dose")}
                value={dose}
                onChange={(e) => setDose(e.target.value)}
              />
              <Input
                label={t("frequency")}
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
              />
            </>
          ) : (
            <Input
              label={t("category")}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          )}
          {kind === "medications" ? null : (
            <Input
              label={t("notes")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowModal(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <span className="inline-flex items-center gap-1.5">
                  <svg
                    className="animate-spin"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                </span>
              ) : (
                t("create")
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
