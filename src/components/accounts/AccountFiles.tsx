import { prisma } from "@/lib/prisma";
import { formatFileSize } from "@/lib/insurance/documents";
import { DeleteSavedFileButton } from "@/components/accounts/DeleteSavedFileButton";
import { Download } from "lucide-react";

const KIND_LABEL = { IMPORT_CSV: "Import", STATEMENT: "Statement", TAX_FORM: "Tax form" } as const;

export async function AccountFiles({ accountId }: { accountId: string }) {
  const files = await prisma.storedFile.findMany({
    where: { accountId },
    orderBy: [{ asOfDate: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="mb-6 border rounded-lg p-4 space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">Saved Files</h2>
      {files.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No files saved yet. Attach a statement when adding a snapshot, or import a CSV, to keep a copy here.
        </p>
      ) : (
        <div className="space-y-1">
          {files.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-3 py-1.5 px-3 rounded-md hover:bg-muted/50 text-sm">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-muted-foreground w-24 shrink-0">
                  {(f.asOfDate ?? f.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </span>
                <span className="text-muted-foreground w-20 shrink-0">{KIND_LABEL[f.kind]}</span>
                <span className="font-medium truncate">{f.fileName}</span>
                <span className="text-muted-foreground shrink-0">{formatFileSize(f.sizeBytes)}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a href={`/api/files/${f.id}`} aria-label={`Download ${f.fileName}`} className="p-2 rounded-md hover:bg-muted">
                  <Download className="h-3.5 w-3.5" />
                </a>
                <DeleteSavedFileButton id={f.id} fileName={f.fileName} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
