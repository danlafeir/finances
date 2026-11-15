import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/files/storage";
import { downloadResponse } from "@/lib/files/response";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const doc = await prisma.insuranceDocument.findUnique({
    where: { id },
    include: { blob: true },
  });

  if (!doc) {
    return new Response("Not found", { status: 404 });
  }

  const data = doc.relPath ? await readStoredFile(doc.relPath) : doc.blob?.data;
  if (!data) {
    return new Response("Not found", { status: 404 });
  }

  return downloadResponse(doc.fileName, doc.mimeType, data);
}
