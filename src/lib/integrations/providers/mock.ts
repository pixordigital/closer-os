import type { IntegrationProvider } from "../types";

export class MockCalendarProvider implements IntegrationProvider {
  readonly name = "mock-calendar";
  readonly kind = "calendar" as const;
  async verify() { return { ok: true, message: "mock connected" }; }
  async listEvents() {
    const now = new Date();
    return [
      { id: "evt-1", title: "Discovery — Acme Co", start: new Date(now.getTime() + 86400000).toISOString() },
      { id: "evt-2", title: "Demo — Globex", start: new Date(now.getTime() + 172800000).toISOString() },
    ];
  }
}

export class MockTranscriptProvider implements IntegrationProvider {
  readonly name = "mock-transcript";
  readonly kind = "transcript" as const;
  async verify() { return { ok: true, message: "mock connected" }; }
  async importTranscript(_c: Record<string, unknown>, input: { text?: string; url?: string }) {
    if (input.text?.trim()) return { content: input.text.trim(), language: "pt-BR" };
    if (input.url) {
      const res = await fetch(input.url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const t = (await res.text()).slice(0, 100_000);
      return { content: t, language: "pt-BR" };
    }
    throw new Error("text or url required");
  }
}
