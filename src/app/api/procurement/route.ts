import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  questionnaireSent: z.boolean().optional(),
  questionnaireReceived: z.boolean().optional(),
  securityReview: z.boolean().optional(),
  legalReview: z.boolean().optional(),
  status: z.enum(["NOT_STARTED", "QUESTIONNAIRE_SENT", "QUESTIONNAIRE_RECEIVED", "SECURITY_REVIEW", "LEGAL_REVIEW", "APPROVED", "REJECTED"]).optional(),
  notes: z.string().optional().nullable(),
  submittedAt: z.string().datetime().optional().nullable(),
  approvedAt: z.string().datetime().optional().nullable(),
  rejectedAt: z.string().datetime().optional().nullable(),
});

export async function GET(req: Request) {
  const { organizationId } = await requireTenant();
  const url = new URL(req.url);
  const dealId = url.searchParams.get("dealId");
  if (!dealId) return NextResponse.json({ error: "dealId required" }, { status: 400 });

  const checklist = await prisma.procurementChecklist.findUnique({
    where: { dealId, organizationId },
  });

  if (!checklist) {
    const created = await prisma.procurementChecklist.create({
      data: { organizationId, dealId },
    });
    return NextResponse.json({ checklist: created });
  }

  return NextResponse.json({ checklist });
}

export async function PATCH(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const url = new URL(req.url);
  const dealId = url.searchParams.get("dealId");
  if (!dealId) return NextResponse.json({ error: "dealId required" }, { status: 400 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const now = new Date();
  const data: any = { ...parsed.data, updatedAt: now };

  if (parsed.data.status === "APPROVED" && !parsed.data.approvedAt) data.approvedAt = now;
  if (parsed.data.status === "REJECTED" && !parsed.data.rejectedAt) data.rejectedAt = now;
  if (parsed.data.questionnaireSent && !parsed.data.submittedAt) data.submittedAt = now;

  const checklist = await prisma.procurementChecklist.upsert({
    where: { dealId, organizationId },
    update: data,
    create: { organizationId, dealId, ...data },
  });

  await prisma.auditLog.create({
    data: { organizationId, userId, action: "procurement.updated", entityType: "ProcurementChecklist", entityId: checklist.id, metadata: parsed.data },
  });

  return NextResponse.json({ checklist });
}