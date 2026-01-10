import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Plus, X, Users, Loader2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createGroup } from "@/lib/storage";
import { getEncryptedItem, setEncryptedItem } from "@/lib/localstorage";
import { LOCAL_CURRENCY_KEY, LOCAL_GROUPS_KEY } from "@/lib/constants";
import { MEMBERS_MAX, GroupSchema, MemberNameSchema } from "@/lib/validations/group.schema";
import { CURRENCIES } from "@/constants";
export default function CreateGroupPage() {
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState("");
  const [currency, setCurrency] = useState(() => {
    return getEncryptedItem(LOCAL_CURRENCY_KEY, '') || "INR";
  }); const [members, setMembers] = useState<string[]>([]);
  const [newMember, setNewMember] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    groupName?: string;
    members?: string;
    memberName?: string,
    memberExists?: string
  }>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const validate = () => {
    const result = GroupSchema.safeParse({ groupName, members });
    const memberNameResult = MemberNameSchema.safeParse(newMember);

    if (!result.success || !memberNameResult.success) {
      const e = result.error.format();
      setErrors({
        groupName: e.groupName?._errors[0],
        members: e.members?._errors[0],
        memberName: memberNameResult?.error?.issues?.[0]?.message,
      });
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);
    const isValid = validate();
    if (!isValid) return; // STOP submit
    setIsSubmitting(true);
    try {
      const group = await createGroup(groupName.trim(), currency, members);
      saveGroupIdToLocal(group.id);
      setEncryptedItem(LOCAL_CURRENCY_KEY, currency);
      navigate(`/group/${group.id}`);
    } catch (error) {
      console.error("Error creating group:", error);
      setIsSubmitting(false);
    }
  };

  const addMember = () => {
    const memberNameResult = MemberNameSchema.safeParse(newMember);
    if (!memberNameResult.success) {
      setErrors((prev) => ({
        ...prev,
        memberName: memberNameResult?.error?.issues?.[0]?.message,
      }));
      return;
    }
    if (members.includes(newMember)) {
      setErrors((prev) => ({
        ...prev,
        memberExists: "Member already added.",
      }));
      return;
    }
    if (!errors.memberName) {
      setMembers([...members, newMember?.trim()]);
      setNewMember("");
    }
  };

  const removeMember = (memberToRemove: string) => {
    setMembers(members.filter((m) => m !== memberToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newMember?.length) {
      e.preventDefault();
      addMember();
    }
  };

  useEffect(() => {
    if (hasSubmitted) validate();
  }, [groupName, members]);


  const saveGroupIdToLocal = (groupId: string) => {
    const existingGroups = getEncryptedItem<string[]>(LOCAL_GROUPS_KEY, []);

    if (!existingGroups.includes(groupId)) {
      setEncryptedItem(LOCAL_GROUPS_KEY, [...existingGroups, groupId]);
    }
  };

  const handleMemberChange = (value: string) => {
    setNewMember(value);
    setErrors((prev) => ({
      ...prev,
      memberExists: null
    }));
    const memberNameResult = MemberNameSchema.safeParse(newMember);
    if (!memberNameResult?.error?.issues?.[0]?.message) {
      setErrors((prev) => ({
        ...prev,
        memberName: null
      }));
      return false;
    }
    if (hasSubmitted) {
      const result = MemberNameSchema.safeParse(value);

      setErrors((prev) => ({
        ...prev,
        memberName: result.success
          ? null
          : result.error.issues[0]?.message,
      }));
    }
  };

  return (
    <Layout>
      <div className="container py-8 md:py-12 max-w-xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <div className="w-14 h-14 rounded-2xl bg-primary-muted flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="text-2xl">Create a Group</CardTitle>
              <CardDescription>
                Set up a new expense group to start tracking shared costs
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="groupName">Group Name<span className="text-destructive">*</span></Label>
                  <Input
                    id="groupName"
                    placeholder="e.g., Paris Trip 2024, Apartment 4B"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    autoFocus
                    aria-invalid={!!errors.groupName}
                    type="text"
                  />
                  {errors.groupName && (
                    <span className="text-xs text-destructive">{errors.groupName}</span>
                  )}
                </div>

                {/* Currency */}
                <div className="space-y-2">
                  <Label htmlFor="currency">Default Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((curr) => (
                        <SelectItem key={curr.code} value={curr.code}>
                          <span className="font-medium">{curr.symbol}</span>
                          <span className="ml-2 text-muted-foreground">{curr.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Members */}
                <div className="space-y-3">
                  <Label>
                    Members <span className="text-destructive">*</span>
                  </Label>

                  {/* Input Row */}
                  <div className="flex gap-2">
                    <Input
                      placeholder={
                        members.length >= MEMBERS_MAX
                          ? "Maximum members reached"
                          : "Enter name"
                      }
                      value={newMember}
                      onChange={(e) => handleMemberChange(e.target.value)}
                      onKeyDown={handleKeyPress}
                      aria-invalid={!!errors.members}
                      disabled={
                        members.length >= MEMBERS_MAX
                      }
                      type="text"
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={addMember}
                      disabled={
                        !newMember?.length || members.length >= MEMBERS_MAX
                      }
                    >
                      <Plus className="w-4 h-4" />
                    </Button>

                  </div>
                  {errors.members && !errors.memberName && !errors.memberExists && (
                    <span className="text-xs text-destructive">{errors.members}</span>
                  )}
                  {errors.memberName && (
                    <span className="text-xs text-destructive">{errors.memberName}</span>
                  )}
                  {errors.memberExists && (
                    <span className="text-xs text-destructive">{errors.memberExists}</span>
                  )}
                  {/* Members List Container */}
                  {members.length > 0 && (
                    <div className="space-y-2">
                      {/* Scrollable Area */}
                      <div className="max-h-[105px] overflow-y-auto scrollbar-thin scrollbar-thumb-rounded">
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex flex-wrap gap-2"
                        >
                          <AnimatePresence mode="popLayout">
                            {members.map((member) => (
                              <motion.div
                                key={member}
                                layout
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                className="flex items-center gap-2 bg-background border rounded-full pl-1 pr-1.5 py-1 shadow-sm"
                              >
                                <UserAvatar name={member} />
                                <span className="text-xs font-medium text-foreground max-w-[120px] truncate" title={member}>
                                  {member}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeMember(member)}
                                  className="w-4 h-4 rounded-full hover:bg-destructive hover:text-white flex items-center justify-center transition-colors"
                                  aria-label={`Remove ${member}`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </motion.div>

                      </div>
                    </div>
                  )}

                </div>

                {/* Submit */}
                <Button type="submit" size="lg" className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Group"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
}
