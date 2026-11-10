import Image from "next/image";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

/** Centred card on the Church Workflow grey, for sign-in and setup screens. */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <Image src="/assets/logo/cw-mark.png" alt="Church Workflow" width={36} height={36} priority />
        <div>
          <p className="font-semibold leading-tight">Service Timer</p>
          <p className="text-xs text-muted-foreground">by Church Workflow</p>
        </div>
      </div>
      <Card className="w-full max-w-md">
        <div className="p-6 sm:p-8">
          <h1 className="text-xl font-semibold leading-tight">{title}</h1>
          {description ? <p className="mt-1.5 text-sm text-muted-foreground">{description}</p> : null}
          <div className="mt-6">{children}</div>
        </div>
      </Card>
      {footer ? <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div> : null}
    </div>
  );
}

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-md border border-destructive-100 bg-destructive-50 px-3 py-2 text-sm text-destructive-700" role="alert">
      {message}
    </p>
  );
}
