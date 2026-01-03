import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Share2, Copy, Check, ArrowRight, Pencil, Loader2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar, AvatarGroup } from "@/components/ui/UserAvatar";
import { formatCurrency } from "@/lib/avatar-utils";
import { getCategoryIcon, EXPENSE_CATEGORIES, type CategoryKey } from "@/components/icons/CategoryIcons";
import { useToast } from "@/hooks/use-toast";
import { getGroup, loadExpenses, type Group, type Expense, type SplitType } from "@/lib/storage";

// Calculate share for each participant based on split type
function calculateShare(expense: Expense, member: string): number {
  if (!expense.participants.includes(member)) return 0;

  const split = expense.splits?.find((s) => s.member === member);

  if (expense.splitType === "equal") {
    return expense.amount / expense.participants.length;
  }

  if (expense.splitType === "percentage") {
    // Use amount directly
    return split?.amount || 0;
  }

  if (expense.splitType === "custom") {
    return split?.amount || 0;
  }

  // Fallback
  return expense.amount / expense.participants.length;
}

// Calculate balances
function calculateBalances(expenses: Expense[], members: string[]) {
  const balances: Record<string, number> = {};
  members.forEach((m) => (balances[m] = 0));

  expenses.forEach((expense) => {
    expense.participants.forEach((p) => {
      const share = calculateShare(expense, p);
      balances[p] -= share;
    });
    balances[expense.paidBy] += expense.amount;
  });

  return balances;
}

// Calculate who owes whom
function calculateSettlements(balances: Record<string, number>) {
  const settlements: { from: string; to: string; amount: number }[] = [];

  const debtors = Object.entries(balances)
    .filter(([_, bal]) => bal < -0.01)
    .map(([name, balance]) => ({ name, balance }))
    .sort((a, b) => a.balance - b.balance);

  const creditors = Object.entries(balances)
    .filter(([_, bal]) => bal > 0.01)
    .map(([name, balance]) => ({ name, balance }))
    .sort((a, b) => b.balance - a.balance);

  let i = 0,
    j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(-debtor.balance, creditor.balance);

    if (amount > 0.01) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: Math.round(amount * 100) / 100,
      });
    }

    debtor.balance += amount;
    creditor.balance -= amount;

    if (Math.abs(debtor.balance) < 0.01) i++;
    if (Math.abs(creditor.balance) < 0.01) j++;
  }

  return settlements;
}


export default function GroupDetailsPage() {
  const { groupId } = useParams();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [group, setGroup] = useState<Group | undefined>();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (groupId) {
        setLoading(true);
        try {
          const [fetchedGroup, fetchedExpenses] = await Promise.all([
            getGroup(groupId),
            loadExpenses(groupId),
          ]);
          setGroup(fetchedGroup);
          setExpenses(fetchedExpenses);
        } catch (error) {
          console.error("Error fetching group data:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchData();
  }, [groupId]);

  if (loading) {
    return (
      <Layout>
        <div className="container py-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!group) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">Group not found</p>
          <Button asChild className="mt-4">
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const balances = calculateBalances(expenses, group.members);
  const settlements = calculateSettlements(balances);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const shareLink = `${window.location.origin}/group/${groupId}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast({
      title: "Link copied!",
      description: "Share this link with your group members",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Layout>
      <div className="container py-6 md:py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon-sm" asChild>
              <Link to="/">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{group.name}</h1>
              <div className="flex items-center gap-3 mt-2">
                <AvatarGroup names={group.members} max={4} />
              </div>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={copyLink}>
            {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            {copied ? "Copied!" : "Share"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground mb-1">Total Expenses</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(totalExpenses, group.currency)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground mb-1">Per Person (avg)</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(totalExpenses / group.members.length, group.currency)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Expenses List */}
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>Expenses</CardTitle>
                <Button asChild size="sm">
                  <Link to={`/group/${groupId}/add-expense`}>
                    <Plus className="w-4 h-4" />
                    Add
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {expenses.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <p>No expenses yet</p>
                    <Button asChild size="sm" className="mt-4">
                      <Link to={`/group/${groupId}/add-expense`}>Add your first expense</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {expenses.map((expense, index) => {
                      const IconComponent = getCategoryIcon(
                        expense.category as CategoryKey,
                        expense.subcategory
                      );
                      const categoryColor =
                        EXPENSE_CATEGORIES[expense.category as CategoryKey]?.color ||
                        "category-uncategorized";

                      return (
                        <motion.div
                          key={expense.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-4 hover:bg-muted/50 transition-colors group"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className="w-11 h-11 rounded-xl flex items-center justify-center"
                              style={{ backgroundColor: `hsl(var(--${categoryColor}) / 0.15)` }}
                            >
                              <IconComponent
                                className="w-5 h-5"
                                style={{ color: `hsl(var(--${categoryColor}))` }}
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate">
                                {expense.description}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Paid by <span className="font-medium">{expense.paidBy}</span> •{" "}
                                {expense.date}
                                {expense.splitType && expense.splitType !== "equal" && (
                                  <span className="ml-1 text-xs">
                                    ({expense.splitType === "percentage" ? "%" : "custom"})
                                  </span>
                                )}
                              </p>
                            </div>

                            <div className="text-right flex items-center gap-3">
                              <div>
                                <p className="font-semibold text-foreground">
                                  {formatCurrency(expense.amount, expense.currency)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {expense.participants.length} people
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                asChild
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Link to={`/group/${groupId}/edit-expense/${expense.id}`}>
                                  <Pencil className="w-4 h-4" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Balances */}
          <div className="space-y-6">
            {/* Who Owes Whom */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Settle Up</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {settlements.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">All settled up!</p>
                ) : (
                  settlements.map((settlement, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl"
                    >
                      <UserAvatar name={settlement.from} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-foreground truncate">
                            {settlement.from}
                          </span>
                          <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium text-foreground truncate">
                            {settlement.to}
                          </span>
                        </div>
                      </div>
                      <span className="font-semibold text-secondary">
                        {formatCurrency(settlement.amount, group.currency)}
                      </span>
                    </motion.div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Individual Balances */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Balances</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.members.map((member, index) => {
                  const balance = balances[member];
                  const isPositive = balance > 0.01;
                  const isNegative = balance < -0.01;

                  return (
                    <motion.div
                      key={member}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar name={member} size="sm" />
                        <span className="font-medium text-foreground">{member}</span>
                      </div>
                      <span
                        className={`font-semibold ${
                          isPositive
                            ? "text-success"
                            : isNegative
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {formatCurrency(balance, group.currency)}
                      </span>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Share Link */}
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-medium text-foreground mb-2">Shareable Link</p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground truncate">
                    {shareLink}
                  </div>
                  <Button variant="outline" size="icon" onClick={copyLink}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
