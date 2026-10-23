// One place that decides what typed text really is, shared by the forms and
// the APIs. Trimming alone isn't enough: invisible characters (e.g. a
// zero-width space) survive `trim()`, so a name made only of one looked blank
// but passed, and "Ann" plus one passed as different from "Ann".
import { z } from "zod";

/** Builds a character class from code points, so no invisible character appears in this file. */
function characterClass(codePoints: (number | [number, number])[]) {
  const parts = codePoints.map((entry) =>
    Array.isArray(entry)
      ? `${String.fromCharCode(entry[0])}-${String.fromCharCode(entry[1])}`
      : String.fromCharCode(entry)
  );
  return new RegExp(`[${parts.join("")}]`, "g");
}

/**
 * Invisible characters that never belong in typed text: zero-width space
 * (200B), word joiner (2060), byte order mark (FEFF), soft hyphen (00AD),
 * Mongolian vowel separator (180E), direction marks (200E, 200F) and direction
 * controls (202A-202E, 2066-2069), which can also make text display reversed.
 */
const INVISIBLE = characterClass([
  0x200b, 0x2060, 0xfeff, 0x00ad, 0x180e, 0x200e, 0x200f, [0x202a, 0x202e], [0x2066, 0x2069],
]);

/**
 * Zero-width non-joiner (200C) and joiner (200D) shape real text in Hindi and
 * other scripts, and join emoji: they stay in saved text but are ignored when
 * comparing or checking for blank.
 */
const JOINERS = characterClass([0x200c, 0x200d]);

/** Unicode-normalized text with the invisible characters removed; spacing untouched. */
export function removeInvisible(value: string) {
  return value.normalize("NFC").replace(INVISIBLE, "");
}

/** A single-line value to save: invisible characters removed, any run of spaces made one space, ends trimmed. */
export function cleanName(value: string) {
  return removeInvisible(value).replace(/\s+/g, " ").trim();
}

/**
 * Multi-line text to save (e.g. a message): invisible characters removed, line
 * breaks kept, trailing spaces on each line and more than one empty line in a
 * row dropped, ends trimmed.
 */
export function cleanText(value: string) {
  return removeInvisible(value)
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** The name to compare by: cleaned, joiners ignored, letter case ignored. */
export function nameKey(value: string) {
  return cleanName(value).replace(JOINERS, "").toLocaleLowerCase();
}

/** True when nothing visible is left once the text is cleaned. Works for single- and multi-line text. */
export function isBlankName(value: string) {
  return nameKey(value) === "";
}

export const isBlankText = isBlankName;

/**
 * A single-line text field: cleaned first (see `cleanName`), then checked.
 * Parsing returns the cleaned value.
 */
export function cleanNameField({ required, max, maxMessage }: { required: string; max: number; maxMessage: string }) {
  return z
    .string()
    .transform(cleanName)
    .pipe(z.string().max(max, maxMessage).refine((value) => !isBlankName(value), required));
}
