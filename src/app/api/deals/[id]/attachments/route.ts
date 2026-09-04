import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { promises as fs } from "fs";
import path from "path";

function baseDir(dealId:string){ return path.join(process.cwd(), "public", "uploads", dealId) }

export async function GET(_req:Request, { params }:{ params:Promise<{id:string}>}){
  const { id } = await params;
  const { organizationId } = await requireTenant();
  const d = await prisma.deal.findFirst({ where:{ id, organizationId }, select:{id:true}});
  if(!d) return NextResponse.json({ error:"Not found" }, { status:404 });
  const dir = baseDir(id);
  try{
    const files = await fs.readdir(dir);
    const items = await Promise.all(files.map(async f=>{
      const st = await fs.stat(path.join(dir,f));
      return { name:f, size: st.size, url:`/uploads/${id}/${encodeURIComponent(f)}`, mtime: st.mtime.toISOString() };
    }));
    return NextResponse.json({ items });
  }catch{ return NextResponse.json({ items: [] }); }
}

export async function POST(req:Request, { params }:{ params:Promise<{id:string}>}){
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  const d = await prisma.deal.findFirst({ where:{ id, organizationId }, select:{id:true}});
  if(!d) return NextResponse.json({ error:"Not found" }, { status:404 });

  // supports FormData (multipart) or JSON { filename, contentBase64 }
  let filename="", buffer:Buffer|null=null;
  const ct = req.headers.get("content-type") ?? "";
  if(ct.includes("multipart/form-data")){
    const fd = await req.formData();
    const f = fd.get("file") as File | null;
    if(!f) return NextResponse.json({ error:"file required" }, { status:400 });
    if(f.size > 10*1024*1024) return NextResponse.json({ error:"max 10MB" }, { status:400 });
    filename = (f.name || "upload").replace(/[^a-zA-Z0-9._-]/g,"_").slice(0,120);
    buffer = Buffer.from(await f.arrayBuffer());
  } else {
    const body = await req.json().catch(()=>null) as { filename?:string, contentBase64?:string }|null;
    if(!body?.filename || !body?.contentBase64) return NextResponse.json({ error:"filename + contentBase64 required" }, { status:400 });
    filename = body.filename.replace(/[^a-zA-Z0-9._-]/g,"_").slice(0,120);
    buffer = Buffer.from(body.contentBase64, "base64");
    if(buffer.length > 10*1024*1024) return NextResponse.json({ error:"max 10MB" }, { status:400 });
  }

  const dir = baseDir(id);
  await fs.mkdir(dir, { recursive:true });
  const dest = path.join(dir, `${Date.now()}-${filename}`);
  await fs.writeFile(dest, buffer);
  const url = `/uploads/${id}/${encodeURIComponent(path.basename(dest))}`;
  await auditLog({ organizationId, userId, action:"deal.attachment_uploaded", entityType:"Deal", entityId:id, metadata:{ filename, url, size: buffer.length } as never });
  return NextResponse.json({ ok:true, filename: path.basename(dest), url, size: buffer.length }, { status:201 });
}
