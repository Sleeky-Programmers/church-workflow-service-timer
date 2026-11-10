import { api } from "./client";
import type { ServerSession, ServerSettings, ServerTemplate } from "@/lib/timer/remote";
import type { TemplateItem } from "@/lib/timer/types";

type Tokens = { accessToken: string; refreshToken: string };

export interface Profile {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  churchId: string | null;
  churchRole?: { roleName: string } | null;
}

// ------------------------------------------------------------------ accounts

export const authApi = {
  login: (email: string, password: string) =>
    api<Tokens & { user: Profile }>("/auth/login", { method: "POST", body: { email, password }, auth: false }),
  register: (body: { firstName: string; lastName: string; email: string; password: string }) =>
    api<{ message: string; otpSent: boolean }>("/auth/register", { method: "POST", body, auth: false }),
  requestOtp: (email: string) =>
    api<{ message: string }>("/auth/request-otp", { method: "POST", body: { email }, auth: false }),
  verifyOtp: (email: string, otp: string) =>
    api<Tokens>("/auth/verify-otp", { method: "POST", body: { email, otp: Number(otp) }, auth: false }),
  profile: () => api<Profile>("/admin/profile"),
  /** Creates the church as a Service Timer church; the API makes its head branch. */
  createChurch: (body: { name: string; address: string; country: string; state: string }) =>
    api<{ _id: string }>("/church", {
      method: "POST",
      body: {
        ...body,
        defaultCurrency: "NGN",
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Lagos",
        product: "SERVICE_TIMER",
      },
    }),
};

// ----------------------------------------------------------------------- team

export type TimerRole = "admin" | "operator" | "viewer";

export const TIMER_ROLE_INFO: Record<TimerRole, { name: string; does: string }> = {
  admin: { name: "Timer Admin", does: "Runs the timer, changes the design, and manages the PIN, links and team." },
  operator: { name: "Timer Operator", does: "Runs the timer and edits programs and templates." },
  viewer: { name: "Timer Viewer", does: "Can watch the timer but not change it." },
};

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  roleName: string;
  /** Null when their access is managed in Church Workflow. */
  timerRole: TimerRole | null;
  isYou: boolean;
  isOwner: boolean;
  suspended: boolean;
  manageable: boolean;
}

export interface TeamInvite {
  id: string;
  email: string;
  name: string;
  roleName: string;
  timerRole: TimerRole | null;
  sentAt: string | null;
}

export interface Team {
  members: TeamMember[];
  invites: TeamInvite[];
  seats: { used: number; limit: number };
  plan?: "FREE" | "CHURCH" | "CHURCH_WORKFLOW";
}

export const teamApi = {
  list: () => api<Team>("/service-timer/team"),
  invite: (body: { email: string; firstName?: string; lastName?: string; role: TimerRole }) =>
    api<{ id: string }>("/service-timer/team/invites", { method: "POST", body }),
  resend: (id: string) => api<{ resent: boolean }>(`/service-timer/team/invites/${id}/resend`, { method: "POST" }),
  cancel: (id: string) => api<{ cancelled: boolean }>(`/service-timer/team/invites/${id}`, { method: "DELETE" }),
  changeRole: (id: string, role: TimerRole) =>
    api<{ id: string }>(`/service-timer/team/members/${id}/role`, { method: "PUT", body: { role } }),
  remove: (id: string) => api<{ removed: boolean }>(`/service-timer/team/members/${id}`, { method: "DELETE" }),
};

/** Accepting an emailed invite (the same endpoints Church Workflow uses). */
export const inviteApi = {
  preview: (token: string) =>
    api<{ email: string; firstName?: string; lastName?: string }>(
      `/auth/preview?token=${encodeURIComponent(token)}`,
      { auth: false },
    ),
  accept: (token: string, body: { firstName: string; lastName: string; password: string }) =>
    api<Tokens>(`/auth/admin-register?token=${encodeURIComponent(token)}`, { method: "POST", body, auth: false }),
};

// --------------------------------------------------------------------- billing

export interface BillingOverview {
  plan: {
    key: "FREE" | "CHURCH" | "CHURCH_WORKFLOW";
    name: string;
    userLimit: number | null;
    importLimit: number;
    customBranding: boolean;
    periodEnd: string | null;
  };
  plans: {
    free: { name: string; users: number; imports: number; customBranding: boolean };
    church: {
      name: string;
      monthlyPrice: number;
      yearlyPrice: number;
      users: number;
      imports: number;
      customBranding: boolean;
    };
  };
  usage: { seats: number; imports: number };
  canPay: boolean;
  payments: { reference: string; amount: number; cycle: "monthly" | "yearly"; paidAt: string }[];
}

export const billingApi = {
  overview: () => api<BillingOverview>("/service-timer/billing"),
  checkout: (cycle: "monthly" | "yearly") =>
    api<{ reference: string; authorizationUrl: string }>("/service-timer/billing/checkout", {
      method: "POST",
      body: { cycle },
    }),
  confirm: (reference: string) =>
    api<{ status: "pending" | "success" | "failed" }>("/service-timer/billing/confirm", {
      method: "POST",
      body: { reference },
    }),
};

// -------------------------------------------------------------- smart import

export interface ImportUsage {
  used: number;
  limit: number;
  resetsOn: string;
}

export interface ImportedItem {
  name: string;
  person: string;
  minutes: number;
  /** False when the minutes or name were estimated or hard to read. */
  confident: boolean;
}

export interface ImportResult {
  serviceName: string;
  serviceStart: string;
  items: ImportedItem[];
  usage: ImportUsage;
}

export const importApi = {
  usage: () => api<ImportUsage>("/service-timer/imports/usage"),
  /** One upload (PDF, .docx or photo) or pasted text; nothing is saved. */
  extract: (input: { file: Blob; fileName: string } | { text: string }) => {
    if ("text" in input) {
      return api<ImportResult>("/service-timer/imports", { method: "POST", body: { text: input.text } });
    }
    const form = new FormData();
    form.append("file", input.file, input.fileName);
    return api<ImportResult>("/service-timer/imports", { method: "POST", body: form });
  },
};

// --------------------------------------------------------------------- timer

export type SettingsPatch = Partial<
  Omit<ServerSettings, "logoUrl" | "hasOwnLogo" | "hasPin" | "displayToken" | "churchNameOverride">
> & { churchName?: string | null };

export const timerApi = {
  updateSettings: (patch: SettingsPatch) =>
    api<ServerSettings>("/service-timer/settings", { method: "PATCH", body: patch }),
  uploadLogo: (file: Blob) => {
    const form = new FormData();
    form.append("file", file, "logo.png");
    return api<ServerSettings>("/service-timer/settings/logo", { method: "POST", body: form });
  },
  removeLogo: () => api<ServerSettings>("/service-timer/settings/logo", { method: "DELETE" }),
  setPin: (pin: string) => api<{ hasPin: boolean }>("/service-timer/settings/pin", { method: "PUT", body: { pin } }),
  clearPin: () => api<{ hasPin: boolean }>("/service-timer/settings/pin", { method: "DELETE" }),
  rotateLinks: () =>
    api<{ displayToken: string }>("/service-timer/settings/display-link/rotate", { method: "POST" }),

  createTemplate: (t: { name: string; serviceStart: string; items: TemplateItem[] }) =>
    api<ServerTemplate>("/service-timer/templates", { method: "POST", body: t }),
  updateTemplate: (id: string, t: { name: string; serviceStart: string; items: TemplateItem[] }) =>
    api<ServerTemplate>(`/service-timer/templates/${id}`, { method: "PUT", body: t }),
  deleteTemplate: (id: string) => api<{ deleted: boolean }>(`/service-timer/templates/${id}`, { method: "DELETE" }),

  /** No login: a display link's snapshot. */
  publicSnapshot: (displayToken: string) =>
    api<{ settings: ServerSettings; session: ServerSession; serverNow: number }>(
      `/service-timer/public/${encodeURIComponent(displayToken)}`,
      { auth: false },
    ),
  /** No login: trade the operator PIN for an operator token. */
  operatorLogin: (displayToken: string, pin: string) =>
    api<{ operatorToken: string; expiresIn: string }>(
      `/service-timer/public/${encodeURIComponent(displayToken)}/operator`,
      { method: "POST", body: { pin }, auth: false },
    ),
};
