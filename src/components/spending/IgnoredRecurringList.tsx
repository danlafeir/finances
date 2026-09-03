"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { unignoreRecurringCharge } from "@/actions/recurringOverrides";

interface IgnoredRecurringListProps {
  descriptions: string[];
}

export function IgnoredRecurringList({ descriptions }: IgnoredRecurringListProps) {
  const router = useRouter();

  if (descriptions.length === 0) return null;

  async function handleRestore(description: string) {
    await unignoreRecurringCharge(description);
    router.refresh();
  }

  return (
    <details className="text-sm text-muted-foreground">
      <summary className="cursor-pointer select-none">
        Marked not recurring ({descriptions.length})
      </summary>
      <ul className="mt-2 space-y-1">
        {descriptions.map((description) => (
          <li key={description} className="flex items-center justify-between gap-3 py-1">
            <span className="truncate">{description}</span>
            <Button size="sm" variant="ghost" onClick={() => handleRestore(description)}>
              Restore
            </Button>
          </li>
        ))}
      </ul>
    </details>
  );
}
