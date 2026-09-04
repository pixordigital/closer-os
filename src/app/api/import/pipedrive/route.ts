import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";

const rowSchema = z.object({
  companyName: z.string().min(1).max(120),
  dealName: z.string().min(1).max(160).optional(),
  value: z.coerce.number().nonnegative().max(999999999999).optional().nullable(),
  currency: z.string().length(3).optional().default("BRL"),
  stage: z.enum(["LEAD","QUALIFIED","DISCOVERY","SOLUTION","PROPOSAL","NEGOTIATION","VERBAL_COMMITMENT","WON","LOST"]).optional().default("LEAD"),
  contactName: z.string().max(120).optional(),
  contactEmail: z.string().email().max(254).optional().or(z.literal("").transform(()=>undefined)),
  contactPhone: z.string().max(40).optional(),
  website: z.string().max(255).optional(),
  industry: z.string().max(80).optional(),
});

const schema = z.object({ rows: z.array(rowSchema).min(1).max(500) });

export async function POST(req:Request){
  const ctx = await requireTenant();
  const { organizationId, userId } = ctx;
  const { requireRole } = await import("@/lib/permissions");
  try{ await requireRole(ctx as never, organizationId, "ADMIN"); }catch(e){ const s=(e as {status?:number})?.status ?? 403; return NextResponse.json({error:(e as Error).message},{status:s}); }
  const body = await req.json().catch(()=>null);
  const p = schema.safeParse(body);
  if(!p.success) return NextResponse.json({ error: p.error.flatten() }, { status:400 });

  let companiesCreated=0, dealsCreated=0, contactsCreated=0, skipped=0;
  const errors: Array<{row:number, error:string}> = [];

  for(let i=0;i<p.data.rows.length;i++){
    const r = p.data.rows[i];
    try{
      let company = await prisma.company.findFirst({ where:{ organizationId, name:{ equals: r.companyName.trim(), mode:"insensitive" as const } } });
      if(!company){
        company = await prisma.company.create({ data:{ organizationId, name: r.companyName.trim(), website: r.website, industry: r.industry }});
        companiesCreated++;
      }
      let contactId: string | undefined;
      if(r.contactName?.trim()){
        const existingContact = r.contactEmail ? await prisma.contact.findFirst({ where:{ organizationId, email: r.contactEmail }}) : null;
        if(existingContact) contactId = existingContact.id;
        else {
          const c = await prisma.contact.create({ data:{ organizationId, companyId: company.id, name: r.contactName.trim(), email: r.contactEmail ?? undefined, phone: r.contactPhone } as never });
          contactId = c.id; contactsCreated++;
        }
      }
      if(r.dealName?.trim()){
        const dealName = r.dealName.trim();
        const dupDeal = await prisma.deal.findFirst({ where:{ organizationId, companyId: company.id, name: dealName }});
        if(dupDeal){ skipped++; continue; }
        await prisma.deal.create({ data:{ organizationId, companyId: company.id, primaryContactId: contactId ?? null, name: dealName, stage: r.stage as never, value: r.value ?? null, currency: r.currency } as never });
        dealsCreated++;
      }
    }catch(e){ skipped++; errors.push({ row:i, error: String(e).slice(0,300)}); }
  }
  await auditLog({ organizationId, userId, action:"import.pipedrive", entityType:"Company", metadata:{ companiesCreated, dealsCreated, contactsCreated, skipped } as never });
  return NextResponse.json({ companiesCreated, dealsCreated, contactsCreated, skipped, errors });
}
