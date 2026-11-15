// Exclude '"' and '\' too, not just non-ASCII — both are legal in filenames on
// macOS/Windows but would otherwise break out of the quoted-string filename param.
export function downloadResponse(fileName: string, mimeType: string, data: Uint8Array): Response {
  const asciiFallback = fileName.replace(/[^\x20-\x7e]|["\\]/g, "_");

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Content-Length": String(data.length),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
