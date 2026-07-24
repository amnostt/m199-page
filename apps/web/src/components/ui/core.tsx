import { Button as BaseButton } from "@base-ui/react/button";
import {
  cloneElement,
  forwardRef,
  type ComponentProps,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from "react";
import * as React from "react";
type ButtonVariant = "default" | "outline" | "destructive" | "ghost";
// prettier-ignore
export interface ButtonProps extends ComponentProps<typeof BaseButton> { variant?: ButtonVariant; size?: "default" | "sm"; }
// prettier-ignore
export function Button({ variant = "default", size = "default", className, ...props }: ButtonProps) { const classes = ["admin-button", `admin-button--${variant}`, size === "sm" && "admin-button--sm", className].filter(Boolean).join(" "); return <BaseButton {...props} className={classes} />; }
// prettier-ignore
type FieldControl = ReactElement<{ id?: string; name?: string; "aria-invalid"?: boolean; "aria-describedby"?: string }>;
// prettier-ignore
export interface FieldProps { name: string; label: string; description?: string; error?: string; children: FieldControl; }
// prettier-ignore
export function Field({ name, label, description, error, children }: FieldProps) { const id = children.props.id ?? name; const descriptionId = `${name}-description`; const errorId = `${name}-error`; const describedBy = [description && descriptionId, error && errorId].filter(Boolean).join(" ") || undefined; return <div className="admin-field" data-invalid={error ? "true" : undefined}><label htmlFor={id}>{label}</label>{cloneElement(children, { id, name, "aria-invalid": error ? true : children.props["aria-invalid"], "aria-describedby": describedBy ?? children.props["aria-describedby"] })}{description && <p id={descriptionId} className="admin-field__description">{description}</p>}{error && <p id={errorId} className="admin-field__error" role="alert">{error}</p>}</div>; }
// prettier-ignore
export const Form = forwardRef<HTMLFormElement, ComponentPropsWithoutRef<"form">>(function Form(props, ref) { return <form ref={ref} {...props} />; });
// prettier-ignore
const tablePart = <T extends keyof React.JSX.IntrinsicElements>(tag: T, className: string) => function TablePart({ className: extra, ...props }: ComponentPropsWithoutRef<T>) { return React.createElement(tag, { className: [className, extra].filter(Boolean).join(" "), ...props }); };
// prettier-ignore
export function Table({ className, children, ...props }: ComponentPropsWithoutRef<"table">) { return <div className="admin-table-wrap"><table className={className ? `admin-table ${className}` : "admin-table"} {...props}>{children}</table></div>; }
// prettier-ignore
export const TableHeader = tablePart("thead", "admin-table__header");
// prettier-ignore
export const TableBody = tablePart("tbody", "admin-table__body");
// prettier-ignore
export const TableRow = tablePart("tr", "admin-table__row");
// prettier-ignore
export const TableHead = tablePart("th", "admin-table__head");
// prettier-ignore
export const TableCell = tablePart("td", "admin-table__cell");
// prettier-ignore
export function Badge({ className, ...props }: ComponentPropsWithoutRef<"span">) { return <span className={["admin-badge", className].filter(Boolean).join(" ")} {...props} />; }
// prettier-ignore
export interface AdminRequestError extends Error { status?: number; code?: string; fieldErrors?: Record<string, string>; retryable?: boolean; }
// prettier-ignore
export function mapAdminError(error: unknown) { const value = error as Partial<AdminRequestError> | null; return { root: error instanceof Error ? error.message : "The request failed. Please try again.", fields: value?.fieldErrors ?? {}, retryable: value?.retryable ?? true }; }
// prettier-ignore
export function LoadingFeedback({ label = "Loading…" }: { label?: string }) { return <div className="admin-feedback" role="status" aria-live="polite">{label}</div>; }
// prettier-ignore
export function EmptyFeedback({ children }: { children: ReactNode }) { return <div className="admin-feedback" role="status">{children}</div>; }
// prettier-ignore
export function ErrorFeedback({ message, onRetry }: { message: string; onRetry?: () => void }) { return <div className="admin-feedback admin-feedback--error" role="alert"><p>{message}</p>{onRetry && <Button type="button" variant="outline" size="sm" onClick={onRetry}>Retry</Button>}</div>; }
