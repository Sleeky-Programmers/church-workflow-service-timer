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
