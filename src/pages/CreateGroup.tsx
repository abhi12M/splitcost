import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
import { LOCAL_GROUPS_KEY } from "@/lib/constants";
import { TextInput } from "@/components/ui/text-input";
const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  { code: "ZAR", symbol: "R", name: "South African Rand" }
];

export default function CreateGroupPage() {
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [members, setMembers] = useState<string[]>([]);
  const [newMember, setNewMember] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllMembers, setShowAllMembers] = useState(false);
  const MAX_MEMBER_NAME_LENGTH = 30;
  const MAX_MEMBERS = 50;
  const MIN_MEMBERS = 2;
  const VISIBLE_MEMBERS = 8;

  useEffect(() => {
    if (members.length <= VISIBLE_MEMBERS) {
      setShowAllMembers(false);
    }
  }, [members]);

  const saveGroupIdToLocal = (groupId: string) => {
    const existingGroups = getEncryptedItem<string[]>(LOCAL_GROUPS_KEY, []);

    if (!existingGroups.includes(groupId)) {
      setEncryptedItem(LOCAL_GROUPS_KEY, [...existingGroups, groupId]);
    }
  };

  const addMember = () => {
    if (newMember.trim() && !members.includes(newMember.trim())) {
      setMembers([...members, newMember.trim()]);
      setNewMember("");
    }
  };

  const removeMember = (memberToRemove: string) => {
    setMembers(members.filter((m) => m !== memberToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addMember();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (groupName.trim() && members.length >= 2) {
      setIsSubmitting(true);
      try {
        const group = await createGroup(groupName.trim(), currency, members);
        saveGroupIdToLocal(group.id);
        navigate(`/group/${group.id}`);
      } catch (error) {
        console.error("Error creating group:", error);
        setIsSubmitting(false);
      }
    }
  };

  const isValid = groupName.trim() && members.length >= 2;

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
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Group Name */}
                {/* <div className="space-y-2">
                  <Label htmlFor="groupName">Group Name</Label>
                  <Input
                    id="groupName"
                    placeholder="e.g., Paris Trip 2024, Apartment 4B"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    autoFocus
                  />
                </div> */}
                <TextInput
                  id="groupName"
                  label="Group Name"
                  placeholder="e.g., Paris Trip 2024, Apartment 4B"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength={50}
                  autoFocus
                  required
                />

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
                  <Label className="flex items-center justify-between">
                    <span>
                      Members <span className="text-destructive">*</span>
                    </span>

                    {newMember.length == MAX_MEMBER_NAME_LENGTH && (
                      <span className="text-destructive text-xs">
                        {newMember.length}/{MAX_MEMBER_NAME_LENGTH}
                      </span>
                    )}
                  </Label>

                  {/* Input Row */}
                  <div className="flex gap-2">
                    <Input
                      placeholder={
                        members.length >= MAX_MEMBERS
                          ? "Maximum members reached"
                          : "Enter name"
                      }
                      value={newMember}
                      onChange={(e) => setNewMember(e.target.value)}
                      onKeyDown={handleKeyPress}
                      maxLength={MAX_MEMBER_NAME_LENGTH}
                      disabled={members.length >= MAX_MEMBERS}
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={addMember}
                      disabled={
                        !newMember.trim() || members.length >= MAX_MEMBERS
                      }
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* {members.length < MAX_MEMBERS && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Max {MAX_MEMBER_NAME_LENGTH} characters</span>
                      <span>{newMember.length}/{MAX_MEMBER_NAME_LENGTH}</span>
                    </div>
                  )} */}

                  {/* Member Counter */}
                  {/* <p className="text-xs text-muted-foreground">
                    {members.length} / {MAX_MEMBERS} members
                  </p> */}

                  {/* Members List */}
                  {members.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-wrap gap-2 mt-3 max-h-[120px] overflow-y-auto"
                    >
                      {(showAllMembers ? members : members.slice(0, 8)).map((member, index) => (
                        <motion.div
                          key={member}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: index * 0.03 }}
                          className="flex items-center gap-2 bg-muted rounded-full pl-1 pr-2 py-1"
                        >
                          <UserAvatar name={member} size="sm" />
                          <span className="text-sm font-medium">{member}</span>

                          <button
                            type="button"
                            onClick={() => removeMember(member)}
                            className="w-5 h-5 rounded-full bg-background hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}

                  {/* Show more / collapse */}
                  {members.length > 8 && (
                    <button
                      type="button"
                      onClick={() => setShowAllMembers(!showAllMembers)}
                      className="text-xs text-primary hover:underline"
                    >
                      {showAllMembers
                        ? "Collapse"
                        : `+${members.length - 8} more`}
                    </button>
                  )}

                  {/* Validation Messages */}
                  {members.length < MIN_MEMBERS && (
                    <p className="text-sm text-muted-foreground">
                      Add at least {MIN_MEMBERS - members.length} more{" "}
                      {members.length === 1 ? "member" : "members"}
                    </p>
                  )}

                  {members.length === MAX_MEMBERS && (
                    <p className="text-sm text-muted-foreground">
                      Limit of {MAX_MEMBERS} members per group reached
                    </p>
                  )}
                </div>

                {/* Submit */}
                <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Group"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
}
