"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TaxYearPickerProps {
  currentYear: number;
}

export function TaxYearPicker({ currentYear }: TaxYearPickerProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  function navigate(year: number) {
    const params = new URLSearchParams(sp.toString());
    params.set("year", String(year));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => navigate(currentYear - 1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium w-16 text-center">{currentYear}</span>
      <Button variant="outline" size="sm" onClick={() => navigate(currentYear + 1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
