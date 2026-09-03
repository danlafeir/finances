# Finances

A personal finance tracker built with Next.js, Prisma, and SQLite. Track accounts, balances, investments, and spending in one place, either by hand or synced automatically from your bank/brokerage via Plaid.

---

## Running locally

**Prerequisites:** Node.js 18+, npm

```bash
# Install dependencies
npm install

# Copy the example env file and fill in your values
cp .env.example .env
```

Edit `.env`:

```
DATABASE_URL="file:./dev.db"
PRICE_TTL_MINUTES=60

PLAID_CLIENT_ID=op://Private/Finances-Plaid/client_id
PLAID_SECRET=op://Private/Finances-Plaid/secret
PLAID_ENV=sandbox
ENCRYPTION_KEY=op://Private/Finances-Plaid/encryption_key
```

`DATABASE_URL` points at a local SQLite file via libSQL. `PRICE_TTL_MINUTES` controls how long stock/ETF price lookups are cached before re-fetching from Yahoo Finance (default 60 is fine).

The Plaid and encryption values are [1Password secret references](https://developer.1password.com/docs/cli/secret-references/), resolved at launch by `op run` (already wired into the `dev`/`build`/`start` scripts — see below) rather than sitting in `.env` as plaintext. To set this up:

1. Create a Plaid developer account at [dashboard.plaid.com](https://dashboard.plaid.com) and grab your `client_id` and Sandbox `secret`.
2. Generate an encryption key: `openssl rand -base64 32`.
3. In 1Password, create an item named `Finances-Plaid` (any vault) with three fields: `client_id`, `secret`, `encryption_key`, filled in with the values above.
4. Adjust the vault segment in `.env` (`Private` by default) if your item lives elsewhere.

`op run` will prompt you to unlock 1Password the first time it needs a secret in a given session.

```bash
# Apply migrations (creates the SQLite file on first run)
npx prisma migrate dev

# Generate the Prisma client
npx prisma generate

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Re-running after schema changes:** edit `prisma/schema.prisma`, then `npx prisma migrate dev --name <description>` followed by `npx prisma generate`, then restart the dev server to pick up the new client. This project uses tracked migrations (`prisma/migrations/`), not `db push`.

---

## Features

### Dashboard

The dashboard gives a high-level snapshot of your financial picture:

- **Net Worth** — total assets (cash, checking, HSA, and brokerage account balances, plus home value) minus liabilities. Off-balance-sheet accounts (529, stock plans) are excluded. The Investments figure shown alongside is a breakdown of what's inside those balances (by ticker), not an addition to the total.
- **Liquid Cash** — sum of all checking and high-yield savings accounts.
- **Total Investments** — sum of qualified brokerage, taxable brokerage, and HSA accounts.

### Accounts

Accounts are the core of the app. Each account has a type, an optional broker, a snapshot balance with an "as of" date, and a live balance computed by adding transactions after that date.

Accounts are grouped into three sections:

| Group | Types |
|---|---|
| **Assets** | Checking, High Yield Savings, HSA, Qualified Brokerage, Taxable Brokerage |
| **Off-Balance Sheet** | 529 College Savings, Stock Plan |
| **Liabilities** | Credit Card, Mortgage |

Off-balance-sheet accounts appear on the accounts page but are excluded from net worth — 529s are earmarked for education and stock plan shares aren't liquid until they vest.

#### Account types

**Checking / High Yield Savings**
Standard cash accounts with a snapshot balance and optional APY (for HYS). Transactions can be imported from CSV exports (Chase and similar formats supported). The detail page shows the last 6 months of transactions.

**Credit Card**
Treated as a liability (subtracts from net worth). Supports CSV transaction import. The spending page shows credit card and checking activity in separate sections, since a checking payment to a card is a transfer, not new spending (see "Spending" below).

**Mortgage**
Enter the home value, loan amount, interest rate, term, and first payment date. The app generates (or imports) a full amortization schedule and shows remaining balance, equity, and next payment on the detail page. Home value is included in net worth assets.

**Qualified / Taxable Brokerage**
Investment accounts with holdings tracked by ticker. Market prices are fetched from Yahoo Finance and cached. Optional annual contribution field for planning.

**HSA**
Treated as an investment account (included in Total Investments). Supports an annual contribution target.

**529 College Savings**
College savings account. Supports a contribution amount and frequency (monthly / quarterly / annually). Excluded from net worth.

**Stock Plan**
RSU / ESOP accounts. Enter the stock ticker and vesting events (date + shares). The detail page highlights the next vesting event and its dollar value at the current price, with total future unvested value shown below. Excluded from net worth.

#### Snapshot balance

Rather than an "opening balance," each account stores a snapshot balance on a specific date. The live balance is:

```
live balance = snapshot balance + sum of transactions strictly after snapshot date
```

This lets you set a known balance at any point and only track changes from there forward.

#### CSV import

Checking and credit card accounts have an "Import Transactions" button on their detail page. The importer:

1. Parses the CSV and auto-detects column mappings for common formats (Chase checking, Chase credit card).
2. Lets you review and confirm the mapping before importing.
3. Deduplicates by a SHA-256 hash of `accountId|date|description|amountCents` — re-importing the same file is safe.

### Connections

Links accounts to a bank or brokerage via [Plaid](https://plaid.com) instead of manual entry/CSV import. A **connection** is one Plaid login ("Item") at an institution — since one login can expose several accounts, and since two people can each have their own login at the same institution, a connection is a separate object from an `Account` and can map to multiple accounts.

- **Connecting** — pick an owner label (just a name tag, e.g. "Dan" — not an app login; the app itself has no authentication), authenticate with the institution through Plaid Link, then map each account Plaid found to either a new or an existing `Account`. A suggested account type is pre-filled based on Plaid's account subtype but always requires confirmation — Plaid can't reliably distinguish, say, a qualified vs. taxable brokerage on its own. Loan-type accounts (mortgages, auto loans, etc.) aren't supported for sync yet.
- **Sync Now** — pulls current balances, new/changed/removed transactions, and investment holdings for a connection (or every connection at once). There's no live webhook — sync is on-demand only. Balances write through the same snapshot mechanism as a manual "Add Snapshot." Holdings synced from Plaid are tagged separately from manually-entered ones and never overwrite them.
- **Reconnecting** — if Plaid reports a login issue, the connection shows "Needs reconnect" and a Reconnect button that re-opens Plaid Link to restore access without re-mapping accounts.
- **Unlinking** — remove a single account's Plaid link (falls back to manual tracking, keeps its history) or remove the whole connection (keeps every linked account and its history, just stops syncing).

A Plaid-linked CHECKING/CREDIT_CARD account's CSV import entry point is hidden, since sync already brings in its transactions — manually adding a balance snapshot is still available if you ever want to record a value between syncs.

### Spending

Tracks recurring charges and unusual activity across checking and credit card accounts, filterable by account and month. Checking and Credit Card accounts get their own section, each with:

- **Total Spent This Month / Recurring Payments / Recurring Investments** — three stat cards. Recurring charges labeled with the **Investment** tag (e.g. a brokerage contribution) are split into "Recurring Investments" instead of "Recurring Payments," since they're savings, not spending. A checking charge labeled **Credit Card** (the recurring autopay to a card) is excluded from both Checking totals and its trend entirely — it's a transfer to money already itemized as purchases on that card's own statement, not new spending. Tagged items stay visible in Recurring Charges either way; only the summed totals change.
- **Spending Trend** — total spend for the trailing 6 months, excluding Credit Card-tagged transfers.
- **Recurring Charges** — vendors you've labeled with a custom name and a tag (Bill, Subscription, Membership, Insurance, Utility, Credit Card, Investment, Other). A charge qualifies as recurring if it billed in at least 2 of the last 3 months, or in the same calendar month across at least 2 of the last 3 years (catching annual charges like insurance renewals).
- **Noticeably Higher Spending** — vendors spending more than 1.5x their trailing 3-month average this month.
- **Unclassified Recurring Charges** — detected recurring charges (monthly or annual) that haven't been labeled yet; label one here to move it into Recurring Charges, or mark it "Not Recurring" if it's a false positive (shown in a shared "Marked not recurring" list at the bottom of the page, restorable at any time).

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | SQLite via libSQL (`@libsql/client`) |
| ORM | Prisma 7 |
| UI | shadcn/ui on `@base-ui/react` |
| Charts | Recharts |
| Prices | Yahoo Finance (`yahoo-finance2`) |
| Bank/brokerage sync | Plaid (`plaid`, `react-plaid-link`) |
| Secrets | 1Password CLI (`op run`) |
