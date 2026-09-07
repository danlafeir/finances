"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import type { InsurancePromptTemplate } from "@/lib/insurance/prompt";

interface InsurancePromptCardProps {
  template: InsurancePromptTemplate;
}

export function InsurancePromptCard({ template }: InsurancePromptCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(template.promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div>
        <p className="text-sm font-medium mb-1">1. Analyze the policy with your own AI tool</p>
        <p className="text-sm text-muted-foreground">
          Give an AI tool (ChatGPT, Claude, etc.) the policy document along with the prompt
          below. It will hand back a JSON object in the exact format this app expects — no
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
        <p className="text-sm font-medium mb-1">2. Expected format</p>
        <pre className="text-xs bg-muted rounded-md p-3 max-h-64 overflow-y-auto whitespace-pre-wrap">
          {template.exampleJson}
        </pre>
      </div>
    </div>
  );
}
