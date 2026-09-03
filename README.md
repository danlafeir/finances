# Finances

A personal finance tracker built with Next.js, Prisma, and SQLite. Track accounts, balances, investments, and spending in one place — no third-party data sync required.

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
DATABASE_URL="file:./prisma/dev.db"
PRICE_TTL_MINUTES=60
```

`DATABASE_URL` points at a local SQLite file via libSQL. `PRICE_TTL_MINUTES` controls how long stock/ETF price lookups are cached before re-fetching from Yahoo Finance (default 60 is fine).

```bash
# Push the schema to the database (creates the SQLite file on first run)
npx prisma db push

# Generate the Prisma client
npx prisma generate

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Re-running after schema changes:** use `npx prisma db push --accept-data-loss` followed by `npx prisma generate`, then restart the dev server to pick up the new client.

---

## Features

### Dashboard

The dashboard gives a high-level snapshot of your financial picture:

- **Net Worth** — total assets (cash accounts + home value + investment holdings) minus liabilities. Off-balance-sheet accounts (529, stock plans) are excluded.
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
