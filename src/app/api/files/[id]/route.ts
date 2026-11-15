import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/files/storage";
import { downloadResponse } from "@/lib/files/response";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const file = await prisma.storedFile.findUnique({ where: { id } });
  const data = file ? await readStoredFile(file.relPath) : null;
  if (!file || !data) {
    return new Response("Not found", { status: 404 });
  }

  return downloadResponse(file.fileName, file.mimeType, data);
}
