"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { uploadInsuranceDocument } from "@/actions/insurance";
import { isAcceptedFile } from "@/lib/insurance/documents";
import { Upload } from "lucide-react";

export function InsuranceDocumentUploader({ policyId }: { policyId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const check = isAcceptedFile(file);
    if (!check.ok) {
      setError(check.error ?? "That file can't be uploaded.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      await uploadInsuranceDocument(policyId, fd);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => inputRef.current?.click()}>
        <Upload className="h-3.5 w-3.5" />
        {loading ? "Uploading..." : "Upload Document"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        className="hidden"
        onChange={handleFileChange}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
