"use client";

import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastData = {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

let toastListeners: Array<(toast: ToastData) => void> = [];
let toastCount = 0;

export function toast(data: Omit<ToastData, "id">) {
  const id = String(++toastCount);
  toastListeners.forEach((listener) => listener({ ...data, id }));
}

export function Toaster() {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  React.useEffect(() => {
    const listener = (t: ToastData) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((p) => p.id !== t.id));
      }, 4000);
    };
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  }, []);

  return (
    <ToastPrimitives.Provider>
      {toasts.map((t) => (
        <ToastPrimitives.Root
          key={t.id}
          className={cn(
            "group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all",
            t.variant === "destructive"
              ? "border-[var(--destructive)] bg-[var(--destructive)] text-[var(--destructive-foreground)]"
              : "border-[var(--border)] bg-[var(--background)]"
          )}
        >
          <div className="grid gap-1">
            {t.title && <div className="text-sm font-semibold">{t.title}</div>}
            {t.description && <div className="text-sm opacity-90">{t.description}</div>}
          </div>
          <ToastPrimitives.Close className="absolute right-1 top-1 rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100">
            <X className="h-4 w-4" />
          </ToastPrimitives.Close>
        </ToastPrimitives.Root>
      ))}
      <ToastPrimitives.Viewport className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:max-w-[420px]" />
    </ToastPrimitives.Provider>
  );
}
