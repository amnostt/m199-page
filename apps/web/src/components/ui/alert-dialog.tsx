import type { ComponentProps } from "react";
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;
const AlertDialogTitle = AlertDialogPrimitive.Title;
const AlertDialogDescription = AlertDialogPrimitive.Description;
const AlertDialogHeader = "div" as const;
const AlertDialogFooter = "div" as const;
const dialogClass =
  "fixed top-1/2 left-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-popover-foreground ring-1 ring-foreground/10 outline-none max-w-[calc(100%-2rem)] sm:max-w-sm";

function AlertDialogOverlay({
  className,
  ...props
}: AlertDialogPrimitive.Backdrop.Props) {
  // prettier-ignore
  return <AlertDialogPrimitive.Backdrop data-slot="alert-dialog-overlay" className={cn("fixed inset-0 isolate z-50 bg-black/10", className)} {...props} />;
}

function AlertDialogContent({
  className,
  ...props
}: AlertDialogPrimitive.Popup.Props) {
  // prettier-ignore
  return <AlertDialogPortal><AlertDialogOverlay /><AlertDialogPrimitive.Popup data-slot="alert-dialog-content" className={cn(dialogClass, className)} {...props} /></AlertDialogPortal>;
}

function AlertDialogAction({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  // prettier-ignore
  return <Button data-slot="alert-dialog-action" className={className} {...props} />;
}

function AlertDialogCancel({
  className,
  variant = "outline",
  ...props
}: AlertDialogPrimitive.Close.Props &
  Pick<ComponentProps<typeof Button>, "variant">) {
  // prettier-ignore
  return <AlertDialogPrimitive.Close data-slot="alert-dialog-cancel" className={className} render={<Button variant={variant} />} {...props} />;
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
