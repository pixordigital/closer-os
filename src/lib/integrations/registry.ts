import type { IntegrationProvider } from "./types";
import { MockCalendarProvider, MockTranscriptProvider } from "./providers/mock";
import { GoogleCalendarStub } from "./providers/googleCalendarStub";
import { MockEmailProvider, GmailStub } from "./providers/email";

const registry = new Map<string, IntegrationProvider>();

function ensureDefaults() {
  if (registry.size === 0) {
    registerIntegration(new MockCalendarProvider());
    registerIntegration(new MockTranscriptProvider());
    registerIntegration(new GoogleCalendarStub());
    registerIntegration(new MockEmailProvider());
    registerIntegration(new GmailStub());
  }
}

export function registerIntegration(p: IntegrationProvider) { registry.set(p.name, p); }
export function getIntegration(name: string): IntegrationProvider {
  ensureDefaults();
  const p = registry.get(name);
  if (!p) throw new Error(`Integration provider not found: ${name}`);
  return p;
}
export function listProviders() { ensureDefaults(); return [...registry.values()]; }
