"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import type { TaxPromptTemplate } from "@/lib/tax/csvTemplates";

interface TaxPromptCardProps {
  template: TaxPromptTemplate;
}

export function TaxPromptCard({ template }: TaxPromptCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(template.promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div>
        <p className="text-sm font-medium mb-1">1. Read the form with your own AI tool</p>
        <p className="text-sm text-muted-foreground">
          Give an AI tool (ChatGPT, Claude, etc.) a photo or PDF of your tax form along with
          the prompt below. It will hand back a CSV in the exact format this app expects — no
          document is ever sent to this app or to us.
        </p>
      </div>

      <div className="relative">
        <pre className="text-xs bg-muted rounded-md p-3 max-h-64 overflow-y-auto whitespace-pre-wrap">
          {template.promptText}
        </pre>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="absolute top-2 right-2"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
          {copied ? "Copied" : "Copy Prompt"}
        </Button>
      </div>

      <div>
        <p className="text-sm font-medium mb-1">2. Expected columns</p>
        <div className="overflow-x-auto border rounded-md">
          <table className="text-xs w-full">
            <thead className="bg-muted/50">
              <tr>
                {template.headers.map((h) => (
                  <th key={h} className="px-3 py-1.5 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                {template.exampleRow.map((v, i) => (
                  <td key={i} className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">{v}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
