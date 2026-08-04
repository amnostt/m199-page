import { Component, createContext, useContext, type ReactNode } from "react";
import { Toaster, toast } from "sonner";
import { Alert, AlertDescription } from "../components/ui/alert.js";
// prettier-ignore
class AdminErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> { state = { failed: false }; static getDerivedStateFromError() { return { failed: true }; } render() { return this.state.failed ? <Alert variant="destructive"><AlertDescription>Algo salió mal. Intenta de nuevo.</AlertDescription></Alert> : this.props.children; } }
export type ToastApi = {
  success(message: string): void;
  error(
    message: string,
    options?: { description?: string; retry?: () => void },
  ): void;
};

const adminToast: ToastApi = {
  success: (message) => toast.success(message, { toasterId: "admin" }),
  error: (message, options) =>
    toast.error(message, {
      toasterId: "admin",
      description: options?.description,
      action: options?.retry
        ? { label: "Reintentar", onClick: options.retry }
        : undefined,
    }),
};
const ToastContext = createContext(adminToast);
export function useAdminToast(): ToastApi {
  return useContext(ToastContext);
}
// prettier-ignore
export interface AdminProvidersProps { children: ReactNode; }

// prettier-ignore
export function AdminProviders({ children }: AdminProvidersProps) {
  return (
    <div
      className="admin-ui min-h-screen bg-background text-foreground"
      data-testid="admin-ui-root"
    >
      <ToastContext.Provider value={adminToast}>
        <AdminErrorBoundary>{children}</AdminErrorBoundary>
        <Toaster id="admin" position="bottom-right" closeButton richColors />
      </ToastContext.Provider>
    </div>
  );
}
