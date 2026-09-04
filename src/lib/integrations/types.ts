// §85 Integration abstraction — mirrors AIProvider pattern
export type IntegrationKind = "calendar" | "transcript" | "crm" | "email";
export type IntegrationStatus = "connected" | "error" | "disconnected";

export interface IntegrationProvider {
  readonly name: string;
  readonly kind: IntegrationKind;
  verify?(config: Record<string, unknown>): Promise<{ ok: boolean; message?: string }>;
  listEvents?(config: Record<string, unknown>, opts?: { max?: number }): Promise<Array<{ id: string; title: string; start: string }>>;
  importTranscript?(config: Record<string, unknown>, input: { text?: string; url?: string }): Promise<{ content: string; language?: string }>;
  sendEmail?(config: Record<string, unknown>, input: { to:string; subject:string; html:string; dealId?:string }): Promise<{ messageId:string }>;
  listInbox?(config: Record<string, unknown>, opts?: { max?: number }): Promise<Array<{ id:string; from:string; subject:string; snippet:string; date:string }>>;
}
