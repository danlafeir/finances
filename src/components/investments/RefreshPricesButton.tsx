"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export function RefreshPricesButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRefresh() {
    setLoading(true);
    try {
      await fetch("/api/prices/refresh", { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
      <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
      Refresh Prices
    </Button>
  );
}
