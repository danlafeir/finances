"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { saveTaxFile } from "@/actions/files";
import { acceptAttr } from "@/lib/files/accept";
import { Upload } from "lucide-react";

export function TaxFormUploader({ taxYear }: { taxYear: number }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setMessage(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("taxYear", String(taxYear));
      const saved = await saveTaxFile(fd);
      if (!saved.ok) {
        setMessage({ text: saved.error, isError: true });
        return;
      }
      setMessage({ text: saved.duplicate ? "Already saved — nothing changed." : "Saved.", isError: false });
      router.refresh();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Upload failed", isError: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => inputRef.current?.click()}>
        <Upload className="h-3.5 w-3.5" />
        {loading ? "Saving..." : `Save a ${taxYear} tax form`}
      </Button>
      <input ref={inputRef} type="file" accept={acceptAttr("TAX_FORM")} className="hidden" onChange={handleFileChange} />
      {message && <p className={message.isError ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{message.text}</p>}
    </div>
  );
}
