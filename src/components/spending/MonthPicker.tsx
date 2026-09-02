"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { prevMonthKey, nextMonthKey, monthKeyLabel } from "@/lib/dates";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MonthPickerProps {
  currentMonth: string;
}

export function MonthPicker({ currentMonth }: MonthPickerProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  function navigate(key: string) {
    const params = new URLSearchParams(sp.toString());
    params.set("month", key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => navigate(prevMonthKey(currentMonth))}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium w-36 text-center">
        {monthKeyLabel(currentMonth)}
      </span>
      <Button variant="outline" size="sm" onClick={() => navigate(nextMonthKey(currentMonth))}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
