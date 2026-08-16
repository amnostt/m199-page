import { useRef, useState, type RefObject } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog.js";
export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  triggerRef?: RefObject<HTMLElement | null>;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
}
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  destructive,
  onConfirm,
  onCancel,
  triggerRef,
  fallbackFocusRef,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  if (!open) return null;
  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } catch {
      // The owning mutation surface reports request failures.
    } finally {
      setBusy(false);
    }
  };
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
    >
      <AlertDialogContent
        initialFocus={cancelRef}
        finalFocus={() =>
          triggerRef?.current ?? fallbackFocusRef?.current ?? true
        }
      >
        <AlertDialogHeader className="flex flex-col gap-2">
          <AlertDialogTitle className="font-heading text-base leading-none font-medium">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end">
          <AlertDialogCancel ref={cancelRef} disabled={busy}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={() => void confirm()}
            disabled={busy}
          >
            {busy ? "Procesando…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
