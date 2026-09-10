/** Normalizes member names so duplicate checks are consistent everywhere. */
export const normalizeMemberName = (name: string) => name.trim().toLocaleLowerCase();

/** Returns true when the candidate already exists, ignoring whitespace and letter case. */
export const isMemberNameAlreadyAdded = (
  memberNames: readonly string[],
  candidate: string,
) => {
  const normalizedCandidate = normalizeMemberName(candidate);
  return memberNames.some((name) => normalizeMemberName(name) === normalizedCandidate);
};

/** Returns true when a saved member list contains any duplicate name. */
export const hasDuplicateMemberNames = (memberNames: readonly string[]) => {
  const normalizedNames = memberNames.map(normalizeMemberName);
  return new Set(normalizedNames).size !== normalizedNames.length;
};
