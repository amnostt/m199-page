import { Select as SelectPrimitive } from "@base-ui/react/select";

import { cn } from "@/lib/utils";
import { CheckIcon, ChevronDownIcon } from "lucide-react";

const Select = SelectPrimitive.Root;
const SelectValue = SelectPrimitive.Value;
const triggerClass =
  "flex h-8 w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-placeholder:text-muted-foreground";
const itemClass =
  "relative flex w-full cursor-default items-center rounded-md py-1 pr-8 pl-1.5 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50";

function SelectTrigger({
  className,
  children,
  ...props
}: SelectPrimitive.Trigger.Props) {
  // prettier-ignore
  return <SelectPrimitive.Trigger data-slot="select-trigger" className={cn(triggerClass, className)} {...props}>{children}<SelectPrimitive.Icon render={<ChevronDownIcon className="size-4 text-muted-foreground" />} /></SelectPrimitive.Trigger>;
}

function SelectContent({
  className,
  children,
  ...props
}: SelectPrimitive.Popup.Props) {
  // prettier-ignore
  return <SelectPrimitive.Portal><SelectPrimitive.Positioner className="isolate z-50"><SelectPrimitive.Popup data-slot="select-content" className={cn("relative z-50 min-w-36 overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10", className)} {...props}><SelectPrimitive.List>{children}</SelectPrimitive.List></SelectPrimitive.Popup></SelectPrimitive.Positioner></SelectPrimitive.Portal>;
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  // prettier-ignore
  return <SelectPrimitive.Item data-slot="select-item" className={cn(itemClass, className)} {...props}><SelectPrimitive.ItemText className="flex flex-1 whitespace-nowrap">{children}</SelectPrimitive.ItemText><SelectPrimitive.ItemIndicator render={<span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />}><CheckIcon className="size-4" /></SelectPrimitive.ItemIndicator></SelectPrimitive.Item>;
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
