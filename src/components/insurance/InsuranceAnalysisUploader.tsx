"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitInsuranceAnalysis } from "@/actions/insurance";
import { extractJsonObject, mapZodIssues, type FieldIssue } from "@/lib/insurance/analysis";
import { InsuranceAnalysisInput } from "@/lib/insurance/schema";

interface DocumentOption {
  id: string;
  fileName: string;
}

interface InsuranceAnalysisUploaderProps {
  policyId: string;
  documents: DocumentOption[];
}

export function InsuranceAnalysisUploader({ policyId, documents }: InsuranceAnalysisUploaderProps) {
  const router = useRouter();
  const [pasted, setPasted] = useState("");
  const [documentId, setDocumentId] = useState<string>("");
  const [errors, setErrors] = useState<FieldIssue[] | null>(null);
  const [preview, setPreview] = useState<{ coverageCount: number; caveatCount: number } | null>(null);
  const [saving, setSaving] = useState(false);

  function handleParse() {
    setPreview(null);
    try {
      const candidate = JSON.parse(extractJsonObject(pasted));
      const result = InsuranceAnalysisInput.safeParse(candidate);
      if (!result.success) {
        setErrors(mapZodIssues(result.error.issues));
        return;
      }
      setErrors(null);
      setPreview({ coverageCount: result.data.coverages.length, caveatCount: result.data.caveats.length });
    } catch {
      setErrors([{ path: "(root)", message: "Could not parse that as JSON." }]);
    }
  }

  async function handleSave() {
    setSaving(true);
    setErrors(null);
    try {
      const result = await submitInsuranceAnalysis(policyId, documentId || null, pasted);
      if (!result.success) {
        setErrors(result.errors);
        return;
      }
      setPasted("");
      setPreview(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">3. Paste the result</p>

      {documents.length > 0 && (
        <div className="space-y-1.5 max-w-xs">
          <Label htmlFor="analysisDocument">Generated from <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Select value={documentId} onValueChange={(v) => setDocumentId(v ?? "")}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Not linked to a document" /></SelectTrigger>
            <SelectContent>
              {documents.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.fileName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="analysisPaste">Paste JSON</Label>
        <textarea
          id="analysisPaste"
          value={pasted}
          onChange={(e) => { setPasted(e.target.value); setPreview(null); setErrors(null); }}
          placeholder="Paste the JSON your AI tool returned"
          className="w-full min-h-[140px] rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm font-mono outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" disabled={!pasted.trim()} onClick={handleParse}>
          Preview
        </Button>
        <Button type="button" size="sm" disabled={!pasted.trim() || saving} onClick={handleSave}>
          {saving ? "Saving..." : "Save Analysis"}
        </Button>
      </div>

      {preview && (
        <p className="text-sm text-muted-foreground">
          Parsed {preview.coverageCount} coverage{preview.coverageCount === 1 ? "" : "s"} and{" "}
          {preview.caveatCount} caveat{preview.caveatCount === 1 ? "" : "s"}.
          {preview.coverageCount === 0 && (
            <span className="text-amber-600"> No coverages were found — check the pasted text before saving.</span>
          )}
        </p>
      )}

      {errors && errors.length > 0 && (
        <div className="text-sm text-destructive space-y-0.5">
          {errors.map((e, i) => (
            <p key={i}>{e.path !== "(root)" ? `${e.path}: ` : ""}{e.message}</p>
          ))}
        </div>
      )}
    </div>
  );
}
