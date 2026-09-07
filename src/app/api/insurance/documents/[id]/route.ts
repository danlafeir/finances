import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const doc = await prisma.insuranceDocument.findUnique({
    where: { id },
    include: { blob: true },
  });

  if (!doc?.blob) {
    return new Response("Not found", { status: 404 });
  }

  const asciiFallback = doc.fileName.replace(/[^\x20-\x7e]/g, "_");

  return new Response(new Uint8Array(doc.blob.data), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
      "Content-Length": String(doc.blob.data.length),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
