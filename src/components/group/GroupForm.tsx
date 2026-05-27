"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { MEMBERS_MAX, MEMBERS_MIN, MEMBER_NAME_MAX, GROUP_NAME_MAX } from "@/lib/validations/group.schema";
import { createGroupSchemas } from "@/lib/validations/group.schema.i18n";
import { CURRENCIES } from "@/constants";

interface GroupFormProps {
  initialData?: {
    name: string;
    currency: string;
    members: string[];
  };
  onSubmit: (data: { name: string; currency: string; members: string[] }) => Promise<void>;
  submitLabel: string;
  isSubmitting: boolean;
}

export function GroupForm({ initialData, onSubmit, submitLabel, isSubmitting }: GroupFormProps) {
  const t = useTranslations("group");
  const tVal = useTranslations("group.validation");
  const { GroupSchema, MemberNameSchema } = useMemo(
    () =>
      createGroupSchemas({
        memberNameRequired: tVal("memberNameRequired"),
        memberNameMax: tVal("memberNameMax", { max: MEMBER_NAME_MAX }),
        groupNameRequired: tVal("groupNameRequired"),
        groupNameMax: tVal("groupNameMax", { max: GROUP_NAME_MAX }),
        membersMin: tVal("membersMin", { min: MEMBERS_MIN }),
        membersMax: tVal("membersMax", { max: MEMBERS_MAX }),
      }),
    [tVal]
  );

  const [groupName, setGroupName] = useState(initialData?.name || "");
  const [currency, setCurrency] = useState(initialData?.currency || "INR");
  const [members, setMembers] = useState<string[]>(initialData?.members || []);
  const [newMember, setNewMember] = useState("");
  const [errors, setErrors] = useState<{
    groupName?: string;
    members?: string;
    memberName?: string;
    memberExists?: string;
  }>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const validate = useCallback(() => {
    const result = GroupSchema.safeParse({ groupName, members });
    if (!result.success) {
      const e = result.error.format();
      setErrors(prev => ({
        ...prev,
        groupName: e.groupName?._errors[0],
        members: e.members?._errors[0],
      }));
      return false;
    }
    setErrors(prev => ({
      ...prev,
      groupName: undefined,
      members: undefined,
    }));
    return true;
  }, [groupName, members]);

  useEffect(() => {
    if (hasSubmitted) validate();
  }, [groupName, members, hasSubmitted, validate]);

  useEffect(() => {
    const result = GroupSchema.shape.groupName.safeParse(groupName);
    setErrors(prev => ({
      ...prev,
      groupName:
        !groupName.trim() && !hasSubmitted
          ? undefined
          : result.success
            ? undefined
            : result.error.issues[0]?.message,
    }));
  }, [groupName, hasSubmitted]);

  useEffect(() => {
    const trimmedMember = newMember.trim();

    if (!trimmedMember) {
      setErrors(prev => ({
        ...prev,
        memberName: undefined,
        memberExists: undefined,
      }));
      return;
    }

    const memberResult = MemberNameSchema.safeParse(newMember);
    setErrors(prev => ({
      ...prev,
      memberName: memberResult.success ? undefined : memberResult.error.issues[0]?.message,
      memberExists: members.includes(trimmedMember) ? t("memberAlreadyAdded") : undefined,
    }));
  }, [newMember, members]);

  const handleAddMember = () => {
    const result = MemberNameSchema.safeParse(newMember);
    if (!result.success) {
      setErrors(prev => ({ ...prev, memberName: result.error.issues[0].message }));
      return;
    }
    if (members.includes(newMember.trim())) {
      setErrors(prev => ({ ...prev, memberExists: t("memberAlreadyAdded") }));
      return;
    }
    setMembers([...members, newMember.trim()]);
    setNewMember("");
    setErrors(prev => ({ ...prev, memberName: undefined, memberExists: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);
    if (!validate()) return;
    await onSubmit({ name: groupName, currency, members });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" onKeyDown={(e) => {
      if (e.key === "Enter") {
        e.preventDefault();
      }
    }}>
      <div className="space-y-2">
        <Label htmlFor="groupName">{t("groupName")}<span className="text-destructive">*</span></Label>
        <Input
          id="groupName"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder={t("groupNamePlaceholder")}
        />
        {errors.groupName && <span className="text-xs text-destructive">{errors.groupName}</span>}
      </div>

      <div className="space-y-2">
        <Label>{t("defaultCurrency")}</Label>
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((curr) => (
              <SelectItem key={curr.code} value={curr.code}>
                {curr.symbol} - {curr.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label>{t("members")} <span className="text-destructive">*</span></Label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                placeholder={members.length >= MEMBERS_MAX ? t("maxReached") : t("enterName")}
                value={newMember}
                onChange={(e) => setNewMember(e.target.value)}
                disabled={members.length >= MEMBERS_MAX}
                aria-invalid={Boolean(errors.memberName || errors.memberExists)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newMember.trim()) {
                    e.preventDefault();
                    handleAddMember();
                  }
                }}
              />
            </div>
            <Button type="button" variant="outline" size="icon" onClick={handleAddMember} disabled={!newMember.trim() || members.length >= MEMBERS_MAX}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {errors.members && <p className="text-xs text-destructive">{errors.members}</p>}
          {errors.memberName && <p className="text-xs text-destructive">{errors.memberName}</p>}
          {errors.memberExists && <p className="text-xs text-destructive">{errors.memberExists}</p>}
        </div>
        {members?.length > 0 && (
          <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto p-1">
            <AnimatePresence mode="popLayout">
              {members.map((m, index) => (
                <motion.div
                  key={`${m}-${index}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 bg-background border rounded-full pl-1 pr-1.5 py-1"
                >
                  <UserAvatar name={m} className="h-6 w-6" />
                  <span className="text-xs font-medium">{m}</span>
                  <button
                    type="button"
                    onClick={() => setMembers(members.filter(name => name !== m))}
                    className="hover:text-destructive transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        {submitLabel}
      </Button>
    </form>
  );
}