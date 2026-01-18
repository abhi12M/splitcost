import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Users, ArrowRight, Trash2, Loader2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvatarGroup } from "@/components/ui/UserAvatar";
import { formatCurrency } from "@/lib/avatar-utils";
import { ReceiptIcon, PlaneIcon, HouseholdIcon, GroceriesIcon } from "@/components/icons/CategoryIcons";
import { deleteGroup, loadGroupsByIds, GroupOverviewItem } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { getEncryptedItem } from "@/lib/localstorage";
import { APP_NAME, LOCAL_GROUPS_KEY } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Icon mapping by group name keywords
function getGroupIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("trip") || lower.includes("travel") || lower.includes("vacation")) return PlaneIcon;
  if (lower.includes("apartment") || lower.includes("house") || lower.includes("rent")) return HouseholdIcon;
  if (lower.includes("grocery") || lower.includes("food")) return GroceriesIcon;
  return ReceiptIcon;
}

function GroupCardSkeleton() {
  return (
    <div className="h-full">
      <div className="rounded-xl border bg-card p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <Skeleton className="w-8 h-8 rounded-md" />
        </div>

        {/* Title */}
        <Skeleton className="h-5 w-2/3" />

        {/* Content */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Skeleton className="w-7 h-7 rounded-full" />
            <Skeleton className="w-7 h-7 rounded-full" />
            <Skeleton className="w-7 h-7 rounded-full" />
          </div>

          <div className="space-y-1 text-right">
            <Skeleton className="h-5 w-20 ml-auto" />
            <Skeleton className="h-3 w-10 ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
export default function HomePage() {
  const [groups, setGroups] = useState<GroupOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const fetchGroups = async () => {
    setLoading(true);
    try {
      // ✅ Get group IDs from encrypted localStorage
      const groupIds = getEncryptedItem<string[]>(LOCAL_GROUPS_KEY, []);
      // ✅ Fetch only those groups
      const loadedGroups = await loadGroupsByIds(groupIds);
      setGroups(loadedGroups);
    } catch (error) {
      console.error("Error loading groups:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleDeleteGroup = async (e: React.MouseEvent, groupId: string) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteGroup(groupId);
    await fetchGroups();
    toast({
      title: "Group deleted",
      description: "The group has been removed",
    });
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="gradient-hero py-16 md:py-24">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-20 h-20 rounded-3xl gradient-primary flex items-center justify-center mx-auto mb-6 shadow-glow"
            >
              <ReceiptIcon className="w-10 h-10 text-primary-foreground" />
            </motion.div>

            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
              Split expenses
              <span className="block text-primary">the easy way</span>
            </h1>

            <p className="text-lg text-muted-foreground mb-8 text-balance">
              Create a group, add expenses, and see who owes whom. No signup required. Share a link
              and settle up instantly.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-base">
                <Link to="/create-group">
                  <Plus className="w-5 h-5" />
                  Create New Group
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-base">
                <Link to="/faq">
                  Learn More
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Groups Section */}
      {loading ? (
        <section className="py-12 md:py-16">
          <div className="container">
            <div className="flex items-center justify-between mb-8">
              {/* Left: Title + subtitle */}
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>

              {/* Right: Button */}
              <Skeleton className="h-8 w-28 rounded-md" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <GroupCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="py-12 md:py-16">
          <div className="container">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-1">Your Groups</h2>
                <p className="text-muted-foreground">Recent expense groups</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/create-group">
                  <Plus className="w-4 h-4" />
                  New Group
                </Link>
              </Button>
            </div>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {groups.map((group) => {
                const IconComponent = getGroupIcon(group.name);
                const totalExpenses = group?.expenses?.reduce((sum, e) => sum + (e?.amount || 0), 0);
                return (
                  <motion.div key={group.id} variants={itemVariants} onClick={() => navigate(`/group/${group.id}`)} >
                    <Card hover className="h-full group">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="w-12 h-12 rounded-xl bg-primary-muted flex items-center justify-center" >
                            <IconComponent className="w-6 h-6 text-primary" />
                          </div>
                          {/* <Button
                            variant="ghost"
                            size="icon-sm"
                            className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => handleDeleteGroup(e, group.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button> */}
                        </div>
                        <CardTitle className="mt-3" >{group.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AvatarGroup names={group?.members} showBelow />
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-foreground">
                              {formatCurrency(totalExpenses, group.currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">Total</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}

              {/* Create New Group Card */}
              <motion.div variants={itemVariants}>
                <Link to="/create-group">
                  <Card
                    hover
                    className="h-full border-dashed border-2 bg-transparent hover:bg-muted/50"
                  >
                    <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Plus className="w-7 h-7 text-muted-foreground" />
                      </div>
                      <p className="font-medium text-foreground mb-1">Create New Group</p>
                      <p className="text-sm text-muted-foreground">Start tracking shared expenses</p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>)}

      {/* Features Section */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Why {APP_NAME}?</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              The simplest expense splitting experience, designed for real life
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {[
              {
                icon: Users,
                title: "No Sign-up Required",
                description:
                  "Just create a group and share the link. Anyone can join and add expenses.",
              },
              {
                icon: ReceiptIcon,
                title: "Smart Splitting",
                description:
                  "Split equally, by percentage, or custom amounts. We handle the math.",
              },
              {
                icon: PlaneIcon,
                title: "Multi-Currency",
                description: "Perfect for trips abroad. Track expenses in any currency.",
              },
            ].map((feature, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card className="text-center h-full">
                  <CardContent className="pt-8">
                    <div className="w-14 h-14 rounded-2xl gradient-coral flex items-center justify-center mx-auto mb-5">
                      <feature.icon className="w-7 h-7 text-secondary-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Ad Placeholder */}
      {/* <section className="py-8">
        <div className="container">
          <div className="p-6 border border-dashed border-border rounded-2xl text-center text-muted-foreground bg-muted/30">
            <p className="text-sm">Advertisement Space</p>
          </div>
        </div>
      </section> */}
    </Layout>
  );
}
