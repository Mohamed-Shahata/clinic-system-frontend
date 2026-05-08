"use client";

import { useState, type ReactNode } from "react";
import { Modal } from "@/components/ui";

interface CreateEntityModalProps {
  locale?: string;
  /** Custom trigger element rendered as-is; clicking it opens the modal */
  trigger?: ReactNode;
  /** Modal title */
  title?: string;
  description?: string;
  /**
   * children can be a plain ReactNode OR a render-prop function
   * that receives a `close` callback:  (close: () => void) => ReactNode
   *
   * Using render-prop avoids the "Functions are not valid as a child of
   * Client Components" error that occurs when a Server Component passes
   * a function as children to a Client Component.
   */
  children: ReactNode | ((close: () => void) => ReactNode);
}

export function CreateEntityModal({
  trigger,
  title = "",
  description,
  children,
}: CreateEntityModalProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // Resolve children — call it if it's a render-prop function
  const resolvedChildren =
    typeof children === "function"
      ? (children as (close: () => void) => ReactNode)(close)
      : children;

  return (
    <>
      {/* Wrap trigger in a plain div so onClick can open the modal */}
      {trigger && (
        <div
          onClick={() => setOpen(true)}
          style={{ display: "contents", cursor: "pointer" }}
        >
          {trigger}
        </div>
      )}

      <Modal
        open={open}
        onClose={close}
        title={title}
        description={description}
      >
        {resolvedChildren}
      </Modal>
    </>
  );
}
