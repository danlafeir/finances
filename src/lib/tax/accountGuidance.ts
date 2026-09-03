import type { AccountType } from "@/generated/prisma/enums";

export interface TaxDecision {
  title: string;
  detail: string;
}

export interface AccountTaxGuidance {
  summary: string;
  notes: string[];
  decisions: TaxDecision[];
}

// General information, not tax advice. Dollar figures here are included only where they're
// not scheduled to change by statute (mortgage debt cap, NIIT thresholds, capital loss
// limit, Section 121 exclusion, 529 Roth-rollover cap) or where the current schedule is
// stated explicitly (SALT cap, 529 K-12 limit — both moved by 2025's tax law and the SALT
// cap keeps moving through 2029). Anything indexed annually with no fixed schedule
// (contribution limits, standard deduction, bracket cutoffs) is left as "check the
// current-year limit" rather than a number that goes stale.
export const ACCOUNT_TAX_GUIDANCE: Record<AccountType, AccountTaxGuidance> = {
  CHECKING: {
    summary: "Interest earned is ordinary taxable income; the balance itself isn't taxed.",
    notes: [
      "Interest is reported on a 1099-INT once it hits $10 for the year, and is taxed at your marginal rate.",
      "Moving money in or out has no tax consequence — deposits and withdrawals aren't income or deductions.",
    ],
    decisions: [
      {
        title: "Parking a large balance here vs. a HYSA or money market",
        detail:
          "Same tax treatment either way (both ordinary income) — the decision is about yield, not taxes.",
      },
    ],
  },
  CASH: {
    summary: "Same tax character as checking — interest is ordinary income, fully taxable.",
    notes: [
      "1099-INT once interest is $10+ for the year.",
      "Not an investment, so there's no cost basis, capital gain, or loss-harvesting angle.",
    ],
    decisions: [
      {
        title: "Comparing the HYSA rate to Treasury bills or muni funds",
        detail:
          "HYSA interest is taxed federally and by your state. T-bill interest is exempt from state (not federal) tax; municipal bond interest is typically exempt from federal (and often in-state) tax. At a high state rate, a lower stated T-bill/muni yield can beat the HYSA after tax.",
      },
    ],
  },
  CREDIT_CARD: {
    summary: "Interest on personal spending isn't deductible.",
    notes: [
      "Interest and fees on personal purchases are a personal expense — no deduction, no basis effect.",
      "If a card is genuinely used for a side business, interest tied to business purchases can be deductible on Schedule C — but that means tracking business vs. personal charges separately, which the IRS expects if you claim it.",
    ],
    decisions: [
      {
        title: "Sign-up or referral bonuses",
        detail:
          "A bonus triggered by spending (e.g. \"spend $4,000, get $500\") is treated as a rebate and isn't taxable income. A cash bonus for simply opening an account (not spend-triggered) is often reported as taxable interest/misc. income by the issuer — check for a 1099-INT or 1099-MISC.",
      },
    ],
  },
  MORTGAGE: {
    summary: "Interest can be an itemized deduction; principal payments never are.",
    notes: [
      "Interest on up to $750,000 of acquisition debt ($375,000 if married filing separately) is deductible on Schedule A if you itemize, for loans originated after 12/15/2017. Older loans keep a $1,000,000 grandfathered limit.",
      "Only matters if your total itemized deductions — this interest, SALT (raised from $10,000 to a $40,000 base for 2025 by 2025's tax law, growing ~1%/year through 2029, reverting to $10,000 in 2030, and phased down for high earners), charitable giving, etc. — exceed the standard deduction. Otherwise you're taking the standard deduction and this interest isn't doing anything for you on the return.",
      "Points paid to originate a purchase-money loan on your main home are generally deductible in the year paid; points paid on a refinance are amortized over the new loan's term instead.",
      "Home equity loan/HELOC interest is only deductible if the proceeds were used to buy, build, or substantially improve the home securing the debt — not for other purposes (post-TCJA rule).",
    ],
    decisions: [
      {
        title: "Extra principal payments vs. investing the difference",
        detail:
          "Prepaying principal doesn't create a bigger deduction — the deduction only follows interest actually paid, and prepaying just reduces future interest (and thus future deductions) slightly. Decide this on the after-tax rate comparison, not on tax grounds.",
      },
      {
        title: "Refinancing",
        detail: "Points paid to refinance are amortized over the new loan term, not deducted up front.",
      },
      {
        title: "Selling the home",
        detail:
          "Gain up to $250,000 ($500,000 married filing jointly) on a primary residence is excluded from capital gains tax if you owned and lived in it for 2 of the last 5 years (Section 121).",
      },
    ],
  },
  QUALIFIED_BROKERAGE: {
    summary:
      "Tax-advantaged retirement account. This app doesn't distinguish Traditional (pre-tax) from Roth (after-tax) sub-types — the two are taxed very differently, so know which one this account is before acting on the notes below.",
    notes: [
      "Traditional (401(k), Traditional/SEP/SIMPLE IRA, etc.): contributions reduce taxable income now (or are pre-tax payroll deferrals); growth is tax-deferred; withdrawals in retirement are taxed as ordinary income.",
      "Roth (Roth 401(k), Roth IRA, etc.): contributions are after-tax, no current deduction; qualified withdrawals — age 59½+ and the account 5+ years old — are entirely tax-free, growth included.",
      "Early withdrawals before 59½ generally trigger ordinary income tax on the taxable portion plus a 10% penalty, with exceptions that vary by plan type: first-time home purchase (up to $10,000) and qualified education are IRA-only exceptions; the Rule of 55 (leaving the employer at/after age 55) is 401(k)/403(b)-only; certain medical expenses and SEPP/72(t) payment schedules apply to both.",
      "Required Minimum Distributions (RMDs) apply to Traditional accounts starting at age 73 (rising to 75 in 2033 under SECURE 2.0). Roth accounts — both Roth IRA and, since 2024, Roth 401(k)/403(b) — have no RMDs during the original owner's lifetime; inherited Roth accounts do.",
    ],
    decisions: [
      {
        title: "Contributing pre-tax vs. Roth",
        detail:
          "Turns on whether your marginal tax rate today is likely higher or lower than it will be when you withdraw. Higher rate now → pre-tax; expect a similar or higher rate later → Roth.",
      },
      {
        title: "Withdrawing early",
        detail:
          "Expect ordinary tax plus a 10% penalty unless an exception applies. If it's short-term liquidity you need, a 60-day rollover (put the money back within 60 days) avoids both.",
      },
      {
        title: "Roth conversion",
        detail:
          "Converting Traditional → Roth is a taxable event in the conversion year (ordinary income on the converted amount), then tax-free growth from there — usually most efficient in a lower-income year.",
      },
      {
        title: "Backdoor Roth contribution",
        detail:
          "If you're over the direct Roth IRA income limit and doing a backdoor conversion, the pro-rata rule applies across ALL your Traditional IRA balances (including this one, if it's Traditional) — you can't cherry-pick just the nondeductible contribution to convert tax-free.",
      },
    ],
  },
  TAXABLE_BROKERAGE: {
    summary: "No tax shelter on contributions or growth — gains, dividends, and interest are taxed as realized.",
    notes: [
      "Dividends: \"qualified\" dividends (US or qualifying foreign corporations, held more than 60 days around the ex-dividend date) get long-term capital gains rates; everything else is ordinary income.",
      "Capital gains: held over 1 year = long-term (0/15/20% federal, depending on income); 1 year or less = short-term (ordinary rates).",
      "Wash sale rule: sell at a loss and buy the same or a substantially identical security within 30 days before or after, and the loss is disallowed for that year — it's added to the new position's basis instead. This is tracked per taxpayer across ALL accounts, not just this one.",
      "Cost basis method (FIFO, specific lot identification, average cost) determines which shares are deemed sold, and therefore the gain or loss — pick lots deliberately when harvesting losses or managing how much gain to recognize.",
      "Net Investment Income Tax (NIIT): an additional 3.8% applies to investment income once MAGI exceeds $200,000 (single) / $250,000 (married filing jointly).",
    ],
    decisions: [
      {
        title: "Selling a position near the 1-year mark",
        detail:
          "Waiting a few extra days can convert a short-term (ordinary-rate) gain into a long-term (preferential-rate) one — check the exact purchase date before selling.",
      },
      {
        title: "Tax-loss harvesting",
        detail:
          "Realizing losses offsets gains dollar-for-dollar, plus up to $3,000/year against ordinary income, with the rest carried forward indefinitely — but avoid repurchasing the same security (or one substantially identical) within 30 days, which triggers the wash sale rule.",
      },
      {
        title: "Reinvested dividends",
        detail:
          "Still taxable in the year received even though you never touched the cash. They also add to your cost basis — forgetting that is the classic way people accidentally overstate a later gain.",
      },
    ],
  },
  STOCK_PLAN: {
    summary: "RSU/ESPP shares from an employer — vesting itself is a taxable event, separate from any later sale.",
    notes: [
      "RSU vesting: the fair market value of shares at vest is taxed as ordinary W-2 income (with withholding) in the vest year, whether or not you sell.",
      "Your cost basis after vest is the FMV at vest — the already-taxed amount. Any further move from vest price to sale price is a capital gain or loss, short- or long-term depending on the holding period measured from the vest date.",
      "ESPP: qualifying vs. disqualifying dispositions are taxed very differently. Selling before the required holding period (generally 1 year from purchase and 2 years from the offering date) is a disqualifying disposition and shifts the discount into ordinary income immediately — check your specific plan's terms.",
      "Broker 1099-Bs commonly report a low or $0 cost basis for vested RSU shares. You have to add back the amount already taxed as income at vest (a basis adjustment on Form 8949) or you'll pay tax on it twice.",
    ],
    decisions: [
      {
        title: "Sell-at-vest vs. hold",
        detail:
          "Selling immediately at vest realizes little to no additional capital gain (basis ≈ sale price) and cuts single-stock concentration risk. Holding exposes further appreciation to capital gains tax and to the stock's own risk on top of your income already being tied to the same employer.",
      },
      {
        title: "Timing a sale around the 1-year mark from vest",
        detail: "Determines whether post-vest appreciation is taxed as short- or long-term gain.",
      },
    ],
  },
  COLLEGE_SAVINGS: {
    summary: "529 plan — no federal deduction going in, tax-free growth and withdrawals for qualified education expenses.",
    notes: [
      "Contributions aren't deductible on the federal return. Many states offer a state income tax deduction or credit for contributions — some only for that state's own plan, some for any state's plan. Worth checking before assuming this account gets a deduction.",
      "Qualified withdrawals (tuition, fees, room & board, books, K-12 tuition/expenses up to $20,000/year as of the 2026 tax year — raised from $10,000 and expanded to cover tutoring, testing fees, and therapies by 2025's tax law, up to $10,000 lifetime toward student loans, apprenticeship costs) are federally tax-free, principal and earnings both.",
      "Non-qualified withdrawals: the earnings portion is taxed as ordinary income plus a 10% penalty. The contributions portion was already after-tax, so it's never taxed or penalized.",
      "Under SECURE 2.0, up to $35,000 (lifetime, subject to annual Roth IRA contribution limits and a requirement the account be 15+ years old) can be rolled from a 529 into the beneficiary's own Roth IRA without the non-qualified penalty.",
    ],
    decisions: [
      {
        title: "The account ends up overfunded",
        detail:
          "Changing the beneficiary to another qualifying family member, or using the Roth IRA rollover option, avoids the 10% penalty that a straight non-qualified withdrawal would trigger.",
      },
      {
        title: "Using it for K-12 vs. college expenses",
        detail:
          "K-12 tuition/expenses only qualify federally up to $20,000/year (2026+), and not every state conforms — some claw back the state deduction if funds are used for K-12.",
      },
    ],
  },
  HSA: {
    summary: "Triple tax advantage — pre-tax in, tax-deferred growth, tax-free out for qualified medical expenses.",
    notes: [
      "The only account type here with all three: contributions are pre-tax (payroll) or deductible (direct), growth isn't taxed as it happens, and withdrawals for qualified medical expenses are never taxed.",
      "After age 65, non-medical withdrawals are taxed as ordinary income only — the 20% penalty goes away, so it behaves like a Traditional IRA at that point. Before 65, a non-qualified withdrawal is ordinary income plus a 20% penalty.",
      "No \"use it or lose it\" — unlike an FSA, the balance rolls over indefinitely and can be invested.",
      "You must be covered by an HSA-eligible high-deductible health plan (HDHP) to contribute new money, though you can still spend down an existing balance without one.",
      "Keep medical receipts indefinitely — you can reimburse yourself years later, tax-free, for any qualified expense incurred after the HSA was opened, even if you paid out of pocket at the time.",
    ],
    decisions: [
      {
        title: "Paying medical bills out of pocket vs. reimbursing from the HSA now",
        detail:
          "Paying out of pocket and letting the HSA balance stay invested — reimbursing yourself later using the saved receipt — captures more years of tax-free growth than pulling the money out immediately.",
      },
      {
        title: "Spending it on a non-medical need before age 65",
        detail:
          "Expect ordinary income tax plus a 20% penalty. After 65, it's just ordinary tax, the same as a Traditional IRA/401(k) withdrawal.",
      },
    ],
  },
};

export function getAccountTaxGuidance(type: AccountType): AccountTaxGuidance {
  return ACCOUNT_TAX_GUIDANCE[type];
}
