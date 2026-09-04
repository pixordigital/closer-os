import type { IntegrationProvider } from "../types";

function getGmailOAuthConfig() {
  const raw = process.env.GOOGLE_GMAIL_CREDENTIALS ?? process.env.GOOGLE_CALENDAR_CREDENTIALS ?? "";
  try {
    const j = JSON.parse(raw);
    return {
      clientId: j.client_id ?? j.clientId,
      clientSecret: j.client_secret ?? j.clientSecret,
      redirectUri: j.redirect_uris?.[0] ?? j.redirectUri ?? `${process.env.APP_URL ?? "http://localhost:3000"}/api/gmail/callback`,
    };
  } catch {
    return null;
  }
}

export class GmailProvider implements IntegrationProvider {
  readonly name = "gmail";
  readonly kind = "email" as const;

  authUrl(state: string) {
    const c = getGmailOAuthConfig();
    if (!c?.clientId) throw new Error("Google Gmail credentials not configured (GOOGLE_GMAIL_CREDENTIALS or GOOGLE_CALENDAR_CREDENTIALS)");
    const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    u.searchParams.set("client_id", c.clientId);
    u.searchParams.set("redirect_uri", c.redirectUri);
    u.searchParams.set("response_type", "code");
    u.searchParams.set("scope", "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email");
    u.searchParams.set("access_type", "offline");
    u.searchParams.set("prompt", "consent");
    u.searchParams.set("state", state);
    return u.toString();
  }

  async verify(config: Record<string, unknown>) {
    const tok = String(config.access_token ?? config.accessToken ?? process.env.GMAIL_TOKEN ?? "");
    if (!tok) return { ok: false, message: "Gmail não conectado — GET /api/gmail/auth" };
    try {
      const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
        headers: { Authorization: `Bearer ${tok}` },
        signal: AbortSignal.timeout(5000),
      });
      if (r.status === 401) return { ok: false, message: "token expirado — reconecte em /api/gmail/auth" };
      return { ok: r.ok, message: r.ok ? "gmail connected" : `HTTP ${r.status}` };
    } catch (e) {
      return { ok: false, message: String(e).slice(0, 300) };
    }
  }

  async sendEmail(config: Record<string, unknown>, input: { to: string; subject: string; html: string }) {
    let tok = String(config.access_token ?? config.accessToken ?? process.env.GMAIL_TOKEN ?? "");
    if (!tok) throw new Error("gmail not configured — conecte em /api/gmail/auth");
    // ponytail: try refresh if 401 and refresh_token exists
    const trySend = async (t: string) => {
      const raw = Buffer.from(`To: ${input.to}\r\nSubject: ${input.subject}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${input.html}`).toString("base64url");
      const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
        signal: AbortSignal.timeout(8000),
      });
      return r;
    };
    let r = await trySend(tok);
    if (r.status === 401 && config.refresh_token) {
      const refreshed = await this.refreshToken(config);
      if (refreshed) {
        tok = refreshed;
        r = await trySend(tok);
      }
    }
    if (!r.ok) throw new Error(`Gmail send ${r.status}: ${(await r.text()).slice(0, 400)}`);
    const j = (await r.json()) as { id: string };
    return { messageId: j.id };
  }

  async listInbox(config: Record<string, unknown>, opts?: { max?: number }) {
    const tok = String(config.access_token ?? config.accessToken ?? process.env.GMAIL_TOKEN ?? "");
    if (!tok) throw new Error("gmail not configured");
    const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${opts?.max ?? 10}&q=newer_than:30d`, {
      headers: { Authorization: `Bearer ${tok}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`Gmail list ${r.status}`);
    const j = (await r.json()) as { messages?: Array<{ id: string }> };
    const out: Array<{ id: string; from: string; subject: string; snippet: string; date: string }> = [];
    for (const m of (j.messages ?? []).slice(0, opts?.max ?? 10)) {
      const d = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, {
        headers: { Authorization: `Bearer ${tok}` },
        signal: AbortSignal.timeout(5000),
      });
      if (!d.ok) continue;
      const dj = (await d.json()) as { snippet?: string; payload?: { headers?: Array<{ name: string; value: string }> } };
      const h = dj.payload?.headers ?? [];
      const get = (n: string) => h.find((x) => x.name.toLowerCase() === n.toLowerCase())?.value ?? "";
      out.push({ id: m.id, from: get("From"), subject: get("Subject") || "(sem assunto)", snippet: dj.snippet ?? "", date: get("Date") || new Date().toISOString() });
    }
    return out;
  }

  private async refreshToken(config: Record<string, unknown>): Promise<string | null> {
    const refresh = String(config.refresh_token ?? config.refreshToken ?? "");
    if (!refresh) return null;
    const cfg = getGmailOAuthConfig();
    if (!cfg?.clientId) return null;
    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: cfg.clientId, client_secret: cfg.clientSecret, refresh_token: refresh, grant_type: "refresh_token" }),
      });
      if (!res.ok) return null;
      const j = (await res.json()) as { access_token: string };
      // persist updated token if we have org context — caller handles; here just return
      return j.access_token ?? null;
    } catch {
      return null;
    }
  }
}
