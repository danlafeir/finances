import { AccountSubtype, AccountType as PlaidAccountType } from "plaid";
import { AccountType } from "@/generated/prisma/enums";

const DIRECT: Partial<Record<AccountSubtype, AccountType>> = {
  [AccountSubtype.Checking]: AccountType.CHECKING,
  [AccountSubtype.CreditCard]: AccountType.CREDIT_CARD,
  [AccountSubtype.ChargeCard]: AccountType.CREDIT_CARD,
  [AccountSubtype.Hsa]: AccountType.HSA,
  [AccountSubtype._529]: AccountType.COLLEGE_SAVINGS,
  [AccountSubtype.StockPlan]: AccountType.STOCK_PLAN,
};

const CASH_LIKE = new Set<AccountSubtype>([
  AccountSubtype.Savings,
  AccountSubtype.MoneyMarket,
  AccountSubtype.Cd,
  AccountSubtype.CashManagement,
  AccountSubtype.Prepaid,
  AccountSubtype.Paypal,
]);

const QUALIFIED_BROKERAGE_LIKE = new Set<AccountSubtype>([
  AccountSubtype._401a,
  AccountSubtype._401k,
  AccountSubtype._403B,
  AccountSubtype._457b,
  AccountSubtype.Ira,
  AccountSubtype.Keogh,
  AccountSubtype.Pension,
  AccountSubtype.ProfitSharingPlan,
  AccountSubtype.Retirement,
  AccountSubtype.Roth,
  AccountSubtype.Roth401k,
  AccountSubtype.Roth403B,
  AccountSubtype.Roth457b,
  AccountSubtype.RothPension,
  AccountSubtype.RothProfitSharingPlan,
  AccountSubtype.RothThriftSavingsPlan,
  AccountSubtype.SepIra,
  AccountSubtype.SimpleIra,
  AccountSubtype.Sarsep,
  AccountSubtype.ThriftSavingsPlan,
]);

const TAXABLE_BROKERAGE_LIKE = new Set<AccountSubtype>([
  AccountSubtype.Brokerage,
  AccountSubtype.NonTaxableBrokerageAccount,
  AccountSubtype.Trust,
  AccountSubtype.Ugma,
  AccountSubtype.Utma,
]);

const UNSUPPORTED_SUBTYPES = new Set<AccountSubtype>([
  AccountSubtype.Mortgage,
  AccountSubtype.Auto,
  AccountSubtype.Student,
  AccountSubtype.Loan,
  AccountSubtype.HomeEquity,
  AccountSubtype.HomeEquityLoan,
  AccountSubtype.Construction,
  AccountSubtype.Consumer,
  AccountSubtype.Commercial,
  AccountSubtype.CommercialLineOfCredit,
  AccountSubtype.LineOfCredit,
  AccountSubtype.Overdraft,
  AccountSubtype.Installment,
]);

export interface AccountTypeSuggestion {
  accountType: AccountType | null;
  confident: boolean;
  supported: boolean;
}

export function suggestAccountType(
  plaidType: PlaidAccountType | string,
  plaidSubtype: AccountSubtype | string | null
): AccountTypeSuggestion {
  if (plaidSubtype && UNSUPPORTED_SUBTYPES.has(plaidSubtype as AccountSubtype)) {
    return { accountType: null, confident: false, supported: false };
  }

  if (plaidSubtype && plaidSubtype in DIRECT) {
    return { accountType: DIRECT[plaidSubtype as AccountSubtype]!, confident: true, supported: true };
  }

  if (plaidSubtype && CASH_LIKE.has(plaidSubtype as AccountSubtype)) {
    return { accountType: AccountType.CASH, confident: false, supported: true };
  }

  if (plaidSubtype && QUALIFIED_BROKERAGE_LIKE.has(plaidSubtype as AccountSubtype)) {
    return { accountType: AccountType.QUALIFIED_BROKERAGE, confident: false, supported: true };
  }

  if (plaidSubtype && TAXABLE_BROKERAGE_LIKE.has(plaidSubtype as AccountSubtype)) {
    return { accountType: AccountType.TAXABLE_BROKERAGE, confident: false, supported: true };
  }

  if (plaidType === PlaidAccountType.Loan) {
    return { accountType: null, confident: false, supported: false };
  }

  return { accountType: null, confident: false, supported: true };
}
