import "server-only";
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
  type Transaction,
  type RemovedTransaction,
  type AccountBase,
  type Holding,
  type Security,
} from "plaid";

export type { Transaction, RemovedTransaction, AccountBase, Holding, Security };

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error("Plaid isn't configured yet — add your credentials in Settings.");
  return value;
}

function getClient(): PlaidApi {
  const plaidEnv = getEnv("PLAID_ENV");
  const basePath = PlaidEnvironments[plaidEnv as keyof typeof PlaidEnvironments];
  if (!basePath) throw new Error(`Unknown PLAID_ENV "${plaidEnv}" (expected "sandbox" or "production")`);

  const configuration = new Configuration({
    basePath,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": getEnv("PLAID_CLIENT_ID"),
        "PLAID-SECRET": getEnv("PLAID_SECRET"),
      },
    },
  });
  return new PlaidApi(configuration);
}

export async function createLinkToken(ownerName: string): Promise<string> {
  const res = await getClient().linkTokenCreate({
    client_name: "Finances",
    language: "en",
    country_codes: [CountryCode.Us],
    user: { client_user_id: ownerName },
    products: [Products.Transactions],
    optional_products: [Products.Investments],
  });
  return res.data.link_token;
}

export async function createUpdateModeLinkToken(
  accessToken: string,
  options?: { accountSelectionEnabled?: boolean }
): Promise<string> {
  const res = await getClient().linkTokenCreate({
    client_name: "Finances",
    language: "en",
    country_codes: [CountryCode.Us],
    user: { client_user_id: "update-mode" },
    access_token: accessToken,
    ...(options?.accountSelectionEnabled
      ? { update: { account_selection_enabled: true } }
      : {}),
  });
  return res.data.link_token;
}

export async function exchangePublicToken(
  publicToken: string
): Promise<{ accessToken: string; itemId: string }> {
  const res = await getClient().itemPublicTokenExchange({ public_token: publicToken });
  return { accessToken: res.data.access_token, itemId: res.data.item_id };
}

export async function getAccountsForItem(accessToken: string): Promise<AccountBase[]> {
  const res = await getClient().accountsGet({ access_token: accessToken });
  return res.data.accounts;
}

export async function syncTransactionsPage(accessToken: string, cursor: string | null) {
  const res = await getClient().transactionsSync({
    access_token: accessToken,
    cursor: cursor ?? undefined,
  });
  return res.data;
}

export async function getInvestmentHoldings(accessToken: string) {
  const res = await getClient().investmentsHoldingsGet({ access_token: accessToken });
  return res.data;
}

export async function getItemStatus(accessToken: string) {
  const res = await getClient().itemGet({ access_token: accessToken });
  return res.data.item;
}

export async function removeItem(accessToken: string): Promise<void> {
  await getClient().itemRemove({ access_token: accessToken });
}

export function isItemLoginRequired(error: unknown): boolean {
  const code = (error as { response?: { data?: { error_code?: string } } })?.response?.data?.error_code;
  return code === "ITEM_LOGIN_REQUIRED";
}
