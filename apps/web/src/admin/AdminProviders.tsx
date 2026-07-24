import { Component, createContext, useContext, type ReactNode } from "react";
import { Toaster, toast } from "sonner";
import { ErrorFeedback } from "../components/ui/feedback.js";
// prettier-ignore
class AdminErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> { state = { failed: false }; static getDerivedStateFromError() { return { failed: true }; } render() { return this.state.failed ? <ErrorFeedback message="Something went wrong. Please try again." /> : this.props.children; } }
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
        ? { label: "Retry", onClick: options.retry }
        : undefined,
    }),
};
const ToastContext = createContext(adminToast);
export function useAdminToast(): ToastApi {
  return useContext(ToastContext);
}
// prettier-ignore
export interface AdminProvidersProps { children: ReactNode; portalId?: string; }

// prettier-ignore
export function AdminProviders({ children, portalId = "admin-portal-root" }: AdminProvidersProps) {
  return (
    <div className="admin-ui" data-testid="admin-ui-root">
      <ToastContext.Provider value={adminToast}>
        <AdminErrorBoundary>{children}</AdminErrorBoundary>
        <Toaster id="admin" position="bottom-right" closeButton richColors />
        <div id={portalId} className="admin-portal" data-testid="admin-portal-root" />
      </ToastContext.Provider>
    </div>
  );
}
