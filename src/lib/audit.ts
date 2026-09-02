import { prisma } from "./db";

export async function auditLog(params: {
  organizationId: string;
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}) {
  try {
    await prisma.auditLog.create({ data: params as never });
  } catch {
    // audit must never break main flow
  }
}
