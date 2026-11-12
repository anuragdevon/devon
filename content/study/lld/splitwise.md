---
title: "Splitwise"
subtitle: "Money in integers, balances that always sum to zero."
description: "Expense sharing with equal, exact and percent splits as strategies, a balance sheet that never loses a cent to rounding, and the greedy algorithm for simplifying debts."
date: 2026-11-12
track: lld
weight: 4
---

Expense sharing looks like bookkeeping, but it tests validation, money handling and one neat algorithm. The rule that makes everything else easy: store money as integers in the smallest unit, and distribute remainders deterministically, so every balance sheet sums to exactly zero.

> [!TIP] The short version
> - **Money:** integer minor units (cents, paise), never `double`.
> - **Split types:** one strategy each, chosen through a map. Validation lives in the strategy.
> - **Balances are derived** from an append-only log of expenses.
> - **Simplify debts:** match the biggest debtor with the biggest creditor using two heaps.

## Requirements

1. Users can create **groups** and add **expenses**, either within a group or one-to-one.
2. An expense has a **payer** (or several payers, as an extension), an amount, participants, and a **split type**: `EQUAL`, `EXACT`, `PERCENT` (and `SHARES` as an extension).
3. Show **balances**: how much each user owes or is owed, per person and per group.
4. **Settle up:** record a payment between two users.
5. *(Follow-up)* **Simplify debts:** the minimum number of transactions needed to settle a group.

**Validation rules:** exact splits must add up to the total; percentages must add up to 100; amounts are integers in the smallest currency unit (rounding must never lose a cent).

## Entities and design

- `User`, `Group`
- `Expense` (id, payer, amount, the list of `Split`s, description, groupId)
- `Split`: `userId` + `amount` (the computed share)
- `SplitStrategy` interface → `EqualSplit`, `ExactSplit`, `PercentSplit`: validates the input and computes each share
- `BalanceSheet`: `Map<userId, Map<userId, Long>>`, where a positive value means "the other user owes me"
- `ExpenseService`: the facade

```text
ExpenseService
  addExpense(ExpenseRequest): Expense
  settle(from, to, amount)
  balancesOf(user)

SplitStrategy (interface)
  computeSplits(long total, List<String> users, List<Double> params): List<Split>

EqualSplit

ExactSplit

PercentSplit

BalanceSheet
  Map<String, Map<String, Long>> net
  record(payer, Split)
  owes(a, b): long

How they connect:
  EqualSplit implements SplitStrategy
  ExactSplit implements SplitStrategy
  PercentSplit implements SplitStrategy
  ExpenseService uses SplitStrategy
  ExpenseService uses BalanceSheet
```

## Core code

```java
enum SplitType { EQUAL, EXACT, PERCENT }
record Split(String userId, long amountMinor) {}
record Expense(String id, String payerId, long totalMinor, List<Split> splits, String groupId, String description) {}

interface SplitStrategy {
    /** params: ignored for EQUAL, exact amounts for EXACT, percentages for PERCENT */
    List<Split> computeSplits(long total, List<String> users, List<Long> params);
}

class EqualSplit implements SplitStrategy {
    public List<Split> computeSplits(long total, List<String> users, List<Long> params) {
        int n = users.size();
        long base = total / n, remainder = total % n;
        List<Split> res = new ArrayList<>();
        for (int i = 0; i < n; i++)                              // spread the remainder: 100 / 3 = 34, 33, 33
            res.add(new Split(users.get(i), base + (i < remainder ? 1 : 0)));
        return res;
    }
}

class ExactSplit implements SplitStrategy {
    public List<Split> computeSplits(long total, List<String> users, List<Long> amounts) {
        if (amounts.size() != users.size()) throw new IllegalArgumentException("Amount count mismatch");
        long sum = amounts.stream().mapToLong(Long::longValue).sum();
        if (sum != total) throw new IllegalArgumentException("Exact amounts " + sum + " != total " + total);
        List<Split> res = new ArrayList<>();
        for (int i = 0; i < users.size(); i++) res.add(new Split(users.get(i), amounts.get(i)));
        return res;
    }
}

class PercentSplit implements SplitStrategy {
    public List<Split> computeSplits(long total, List<String> users, List<Long> percents) {
        if (percents.stream().mapToLong(Long::longValue).sum() != 100)
            throw new IllegalArgumentException("Percentages must sum to 100");
        List<Split> res = new ArrayList<>();
        long allocated = 0;
        for (int i = 0; i < users.size(); i++) {
            long share = (i == users.size() - 1) ? total - allocated   // the last user absorbs rounding
                                                 : total * percents.get(i) / 100;
            allocated += share;
            res.add(new Split(users.get(i), share));
        }
        return res;
    }
}

class BalanceSheet {
    // net.get(a).get(b) > 0  → b owes a that much
    private final Map<String, Map<String, Long>> net = new HashMap<>();

    synchronized void record(String payer, Split s) {
        if (s.userId().equals(payer)) return;                    // the payer's own share
        adjust(payer, s.userId(), s.amountMinor());
    }
    synchronized void settle(String from, String to, long amount) { adjust(from, to, amount); } // from paid to

    private void adjust(String creditor, String debtor, long amt) {
        net.computeIfAbsent(creditor, k -> new HashMap<>()).merge(debtor, amt, Long::sum);
        net.computeIfAbsent(debtor, k -> new HashMap<>()).merge(creditor, -amt, Long::sum);
    }
    synchronized Map<String, Long> balancesOf(String user) {
        return Map.copyOf(net.getOrDefault(user, Map.of()));
    }
}

class ExpenseService {
    private final Map<SplitType, SplitStrategy> strategies = Map.of(
        SplitType.EQUAL, new EqualSplit(), SplitType.EXACT, new ExactSplit(), SplitType.PERCENT, new PercentSplit());
    private final BalanceSheet balances = new BalanceSheet();
    private final List<Expense> expenses = new CopyOnWriteArrayList<>();

    public Expense addExpense(String payer, long total, List<String> users, SplitType type,
                              List<Long> params, String groupId, String desc) {
        if (total <= 0) throw new IllegalArgumentException("Amount must be positive");
        List<Split> splits = strategies.get(type).computeSplits(total, users, params);
        Expense e = new Expense(UUID.randomUUID().toString(), payer, total, splits, groupId, desc);
        expenses.add(e);
        splits.forEach(s -> balances.record(payer, s));
        return e;
    }
    public void settleUp(String from, String to, long amount) { balances.settle(from, to, amount); }
    public Map<String, Long> balancesOf(String user) { return balances.balancesOf(user); }
}
```

## Simplify debts (a popular follow-up)

**Idea:** only each person's **net balance** matters. Repeatedly match the person with the largest debt against the person with the largest credit, using two heaps. This greedy approach gives at most `n-1` transactions. (The true minimum is NP-hard in general; mention that, then use the greedy.)

```java
List<String> simplify(Map<String, Long> netBalance) {        // +ve: should receive, -ve: should pay
    PriorityQueue<Map.Entry<String, Long>> creditors = new PriorityQueue<>((a, b) -> Long.compare(b.getValue(), a.getValue()));
    PriorityQueue<Map.Entry<String, Long>> debtors   = new PriorityQueue<>(Comparator.comparingLong(Map.Entry::getValue));
    netBalance.forEach((u, v) -> {
        if (v > 0) creditors.add(new AbstractMap.SimpleEntry<>(u, v));
        else if (v < 0) debtors.add(new AbstractMap.SimpleEntry<>(u, v));
    });
    List<String> txns = new ArrayList<>();
    while (!creditors.isEmpty() && !debtors.isEmpty()) {
        var c = creditors.poll(); var d = debtors.poll();
        long amt = Math.min(c.getValue(), -d.getValue());
        txns.add(d.getKey() + " pays " + c.getKey() + " " + amt);
        if (c.getValue() - amt > 0) creditors.add(new AbstractMap.SimpleEntry<>(c.getKey(), c.getValue() - amt));
        if (d.getValue() + amt < 0) debtors.add(new AbstractMap.SimpleEntry<>(d.getKey(), d.getValue() + amt));
    }
    return txns;
}
```

## Design decisions to explain

- **Money as `long` minor units (cents, paise)**, with deterministic remainder distribution, so balances always sum exactly to zero.
- **A strategy per split type, selected through a map.** Adding `SHARES` is a single new class.
- **Validation lives inside each strategy,** close to the rule it checks.
- **Expenses are an append-only log; balances are derived.** In production, you can rebuild balances from expenses. Edits are recorded as a reversal plus a new expense, which gives an audit trail.

## Extensions

- **Multiple payers:** an expense gets `List<Payment>` alongside `List<Split>`. The net effect per user = paid − owed.
- **Multiple currencies:** store the currency per expense, and convert at settlement time with an FX snapshot.
- **Edit/delete an expense:** reverse the old splits, then apply the new ones, atomically.
- **Notifications and reminders:** an Observer on `ExpenseAdded`.
- **Concurrency at scale:** a DB transaction per expense (insert the expense and its splits, update balance rows with `balance = balance + ?`).
