import type { IntegrationProvider } from "../types";

// ponytail: real OAuth deferred — stub validates shape and probes API only when GOOGLE_CALENDAR_CREDENTIALS set.
// Upgrade path: OAuth 2.0 consent → token refresh → fetch https://www.googleapis.com/calendar/v3/calendars/primary/events
export class GoogleCalendarStub implements IntegrationProvider {
  readonly name = "google-calendar";
  readonly kind = "calendar" as const;
  async verify(config: Record<string, unknown>) {
    const creds = (config.credentials as string) || process.env.GOOGLE_CALENDAR_CREDENTIALS || "";
    if (!creds) return { ok: false, message: "GOOGLE_CALENDAR_CREDENTIALS not configured" };
    // ponytail: probe real API when configured — else mock shape check
    try {
      const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=1", {
        headers: { Authorization: `Bearer ${String(creds).slice(0, 200)}` },
        signal: AbortSignal.timeout(5000),
      });
      if (res.status === 401) return { ok: false, message: "invalid credentials (401)" };
      return { ok: res.ok, message: res.ok ? "connected" : `HTTP ${res.status}` };
    } catch (e) { return { ok: false, message: String(e).slice(0, 300) }; }
  }
  async listEvents(config: Record<string, unknown>) {
    const v = await this.verify(config);
    if (!v.ok) throw new Error(v.message);
    // minimal live path — call real API
    const token = String((config.credentials as string) || process.env.GOOGLE_CALENDAR_CREDENTIALS || "");
    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=5&orderBy=startTime&singleEvents=true", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Google Calendar ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const j = await res.json() as { items?: Array<{ id: string; summary?: string; start?: { dateTime?: string; date?: string } }> };
    return (j.items ?? []).map((it) => ({ id: it.id, title: it.summary ?? "(sem título)", start: it.start?.dateTime ?? it.start?.date ?? new Date().toISOString() }));
  }
}
