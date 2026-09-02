import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllAccountsWithBalances } from "@/actions/accounts";
import { formatCents } from "@/lib/money";

const ACCESSIBLE_INVESTMENT_TYPES = new Set(["TAXABLE_BROKERAGE"]);
const RESTRICTED_INVESTMENT_TYPES = new Set(["QUALIFIED_BROKERAGE", "HSA"]);
const LIQUID_TYPES = new Set(["CHECKING", "CASH"]);

export async function AccessibleInvestmentsCard() {
  const accounts = await getAllAccountsWithBalances();
  const total = accounts
    .filter((a) => ACCESSIBLE_INVESTMENT_TYPES.has(a.type))
    .reduce((s, a) => s + a.balanceCents, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-muted-foreground font-normal">Accessible Investments</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold tabular-nums">{formatCents(total)}</p>
        <p className="text-xs text-muted-foreground mt-2">Taxable brokerage</p>
      </CardContent>
    </Card>
  );
}

export async function RestrictedInvestmentsCard() {
  const accounts = await getAllAccountsWithBalances();
  const total = accounts
    .filter((a) => RESTRICTED_INVESTMENT_TYPES.has(a.type))
    .reduce((s, a) => s + a.balanceCents, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-muted-foreground font-normal">Restricted Investments</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold tabular-nums">{formatCents(total)}</p>
        <p className="text-xs text-muted-foreground mt-2">Qualified brokerage & HSA</p>
      </CardContent>
    </Card>
  );
}

export async function LiquidCashCard() {
  const accounts = await getAllAccountsWithBalances();
  const total = accounts
    .filter((a) => LIQUID_TYPES.has(a.type))
    .reduce((s, a) => s + a.balanceCents, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-muted-foreground font-normal">Liquid Cash</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold tabular-nums">{formatCents(total)}</p>
        <p className="text-xs text-muted-foreground mt-2">Checking & high yield savings</p>
      </CardContent>
    </Card>
  );
}
