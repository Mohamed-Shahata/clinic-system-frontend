"use client";
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Button, Card, CardBody, CardHeader, Modal } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

interface Service {
  id: string;
  name: string;
  price: number;
  category?: string | null;
}

export function ServiceCatalogSettings() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const { addToast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState({ name: "", price: "", category: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/services");
      const data = await res.json();
      setServices(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", price: "", category: "" });
    setShowModal(true);
  };
  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({
      name: s.name,
      price: String(s.price),
      category: s.category ?? "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) return;
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        price: Number(form.price),
        category: form.category.trim() || undefined,
      };
      const res = await fetch(
        editing ? `/api/services/${editing.id}` : "/api/services",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (res.ok) {
        addToast(
          "success",
          isAr
            ? editing
              ? "تم التعديل"
              : "تمت الإضافة"
            : editing
              ? "Updated"
              : "Added",
        );
        setShowModal(false);
        void load();
      } else {
        addToast("error", isAr ? "حدث خطأ" : "Error");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
      if (res.ok) {
        addToast("success", isAr ? "تم الحذف" : "Deleted");
        void load();
      } else {
        addToast("error", isAr ? "حدث خطأ" : "Error");
      }
    } finally {
      setDeleting(null);
    }
  };

  const grouped = services.reduce<Record<string, Service[]>>((acc, s) => {
    const cat = s.category ?? (isAr ? "عام" : "General");
    acc[cat] = [...(acc[cat] ?? []), s];
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {isAr ? "كتالوج الخدمات" : "Service Catalog"}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              {isAr
                ? "الخدمات التي تقدمها العيادة وأسعارها"
                : "Services offered by the clinic and their prices"}
            </p>
          </div>
          <Button size="sm" onClick={openCreate}>
            {isAr ? "+ إضافة خدمة" : "+ Add Service"}
          </Button>
        </div>
      </CardHeader>
      <CardBody>
        {loading ? (
          <p className="py-6 text-center text-sm text-muted">
            {isAr ? "جاري التحميل..." : "Loading..."}
          </p>
        ) : services.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-sm text-muted">
              {isAr ? "لا توجد خدمات بعد" : "No services yet"}
            </p>
            <Button size="sm" variant="secondary" onClick={openCreate}>
              {isAr ? "أضف أول خدمة" : "Add first service"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                  {cat}
                </p>
                <div className="space-y-1.5">
                  {items.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5"
                    >
                      <p className="text-sm font-medium text-foreground">
                        {s.name}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold text-primary">
                          {Number(s.price).toLocaleString()} EGP
                        </span>
                        <button
                          onClick={() => openEdit(s)}
                          className="text-xs text-muted hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-surface-2"
                        >
                          {isAr ? "تعديل" : "Edit"}
                        </button>
                        <button
                          onClick={() => void handleDelete(s.id)}
                          disabled={deleting === s.id}
                          className="text-xs text-danger/70 hover:text-danger transition-colors px-1.5 py-0.5 rounded hover:bg-danger/10"
                        >
                          {deleting === s.id ? "..." : isAr ? "حذف" : "Del"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={
          isAr
            ? editing
              ? "تعديل خدمة"
              : "إضافة خدمة"
            : editing
              ? "Edit Service"
              : "Add Service"
        }
        closeLabel={isAr ? "إلغاء" : "Cancel"}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted">
              {isAr ? "اسم الخدمة" : "Service Name"}
            </label>
            <input
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder={isAr ? "مثال: حشو ضرس" : "e.g. Tooth filling"}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">
                {isAr ? "السعر (EGP)" : "Price (EGP)"}
              </label>
              <input
                type="number"
                min="0"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.price}
                onChange={(e) =>
                  setForm((p) => ({ ...p, price: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">
                {isAr ? "الفئة (اختياري)" : "Category (optional)"}
              </label>
              <input
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder={isAr ? "مثال: الأسنان" : "e.g. Dental"}
                value={form.category}
                onChange={(e) =>
                  setForm((p) => ({ ...p, category: e.target.value }))
                }
              />
            </div>
          </div>
          <Button
            className="w-full"
            loading={saving}
            onClick={() => void handleSave()}
          >
            {isAr
              ? editing
                ? "حفظ التعديل"
                : "إضافة الخدمة"
              : editing
                ? "Save Changes"
                : "Add Service"}
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
