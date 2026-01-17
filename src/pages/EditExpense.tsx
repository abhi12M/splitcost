import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Trash2, Loader2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ExpenseForm } from "@/components/expense/ExpenseForm";
import { getGroup, getExpense, updateExpense, deleteExpense, type Group, type Expense, EditExpenseInput, GroupWithMembers } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";

export default function EditExpensePage() {
  const { groupId, expenseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [group, setGroup] = useState<GroupWithMembers | undefined>();
  const [expense, setExpense] = useState<EditExpenseInput | undefined>();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (groupId && expenseId) {
        setLoading(true);
        try {
          const [fetchedGroup, fetchedExpense] = await Promise.all([
            getGroup(groupId),
            getExpense(groupId, expenseId),
          ]);
          setGroup(fetchedGroup);
          setExpense(fetchedExpense);
        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchData();
  }, [groupId, expenseId]);

  if (loading) {
    return (
      <Layout>
        <div className="container py-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!group || !expense) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">Expense not found</p>
          <Button asChild className="mt-4">
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const handleSubmit = async (data: Parameters<typeof updateExpense>[2]) => {
    setIsSubmitting(true);
    try {
      await updateExpense(groupId!, expenseId!, data);
      toast({
        title: "Expense updated",
        description: "Your changes have been saved",
      });
      navigate(`/group/${groupId}`);
    } catch (error) {
      console.error("Error updating expense:", error);
      toast({
        title: "Error",
        description: "Failed to update expense",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteExpense(groupId!, expenseId!);
      toast({
        title: "Expense deleted",
        description: "The expense has been removed",
      });
      navigate(`/group/${groupId}`);
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  };

  return (
    <Layout>
      <div className="container py-6 md:py-8 max-w-2xl">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to={`/group/${groupId}`}>
            <ArrowLeft className="w-4 h-4" />
            Back to group
          </Link>
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">Edit Expense</CardTitle>
                  <CardDescription>Modify the expense details</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <ExpenseForm
                members={group.members}
                defaultCurrency={group.currency}
                initialData={{
                  description: expense.description,
                  amount: expense.amount,
                  currency: expense.currency,
                  paidByUserId: expense.paidByUserId,
                  participantUserIds: expense.participantUserIds,
                  splits: expense.splits || [],
                  splitType: expense.splitType || "equal",
                  category: expense.category,
                  subcategory: expense.subcategory,
                }}
                onSubmit={handleSubmit}
                submitLabel={isSubmitting ? "Saving..." : "Save Changes"}
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
}
