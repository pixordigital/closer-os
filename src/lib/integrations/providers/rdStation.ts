import type { IntegrationProvider } from "../types";

export class RDStationProvider implements IntegrationProvider {
  readonly name = "rdstation";
  readonly kind = "crm" as const;

  authUrl(_state: string) {
    return "https://api.rd.services/auth/dialog?client_id=RD_STATION_CLIENT_ID";
  }

  async verify(config: Record<string, unknown>) {
    const token = String(config.access_token ?? config.token ?? process.env.RD_STATION_TOKEN ?? "");
    if (!token) return { ok: false, message: "RD Station token não configurado — adicione em /integrations" };
    try {
      const r = await fetch("https://api.rd.services/platform/contacts?limit=1", { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) });
      if (r.status === 401) return { ok: false, message: "token RD expirado" };
      return { ok: r.ok, message: r.ok ? "rdstation connected" : `HTTP ${r.status}` };
    } catch (e) { return { ok: false, message: String(e).slice(0, 300) }; }
  }

  async importContacts(config: Record<string, unknown>, opts?: { limit?: number }) {
    const token = String(config.access_token ?? config.token ?? process.env.RD_STATION_TOKEN ?? "");
    const limit = opts?.limit ?? 50;
    const r = await fetch(`https://api.rd.services/platform/contacts?limit=${limit}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`RD import ${r.status}: ${(await r.text()).slice(0, 400)}`);
    const j = await r.json() as { contacts?: Array<{ name: string; email: string; company?: string; phone?: string }> };
    return (j.contacts ?? []).map(c => ({ name: c.name, email: c.email, company: c.company, phone: c.phone }));
  }
}
