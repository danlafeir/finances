"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { upsertVendorLabel } from "@/actions/vendorLabels";
import { VENDOR_TAGS, VENDOR_TAG_LABEL } from "@/lib/vendorTags";
import type { VendorTag } from "@/generated/prisma/client";

interface VendorLabelFormProps {
  description: string;
  existingLabel?: { label: string; tag: VendorTag };
  onDone: () => void;
}

export function VendorLabelForm({ description, existingLabel, onDone }: VendorLabelFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const label = fd.get("label") as string;
    const tag = fd.get("tag") as VendorTag;

    try {
      await upsertVendorLabel(description, label, tag);
      router.refresh();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Description</Label>
        <p className="text-sm text-muted-foreground border rounded-md px-3 py-2 bg-muted/30">
          {description}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="label">Label</Label>
        <Input
          id="label"
          name="label"
          required
          defaultValue={existingLabel?.label ?? ""}
          placeholder="e.g. Car Insurance"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tag">Tag</Label>
        <Select name="tag" items={VENDOR_TAG_LABEL} defaultValue={existingLabel?.tag ?? "OTHER"} required>
          <SelectTrigger>
            <SelectValue placeholder="Select tag" />
          </SelectTrigger>
          <SelectContent>
            {VENDOR_TAGS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : existingLabel ? "Save Changes" : "Add Label"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
