"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Account } from "@/generated/prisma/client";

interface AccountFilterProps {
  accounts: Account[];
  currentAccount: string;
}

export function AccountFilter({ accounts, currentAccount }: AccountFilterProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  function onChange(value: string | null) {
    if (value === null) return;
    const params = new URLSearchParams(sp.toString());
    if (value === "all") {
      params.delete("account");
    } else {
      params.set("account", value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={currentAccount} onValueChange={onChange}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="All Accounts" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Accounts</SelectItem>
        {accounts.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            {a.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
