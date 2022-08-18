import XRegExp from "xregexp";

interface IRawReplaceKey {
  raw: ReplaceKey;
}

interface INestedKey {
  delimiters: [string, string];
  translations: Replacer[];
  escape?: string;
}

type ReplaceKey = [string, string];
export type Replacer = ReplaceKey | INestedKey | IRawReplaceKey;

export type CompiledReplacer = [
  RegExp,
  string | ((m: XRegExp.MatchSubString) => string),
  XRegExp.MatchScope
];

/**
 * Compiles a plain object into a regexp thing.
 *
 * @param entry Regex and replacement pair, or delimited match object.
 * @param insensitive Whether the replacement should be case-insensitive or not.
 */
export default function compileKey(
  entry: Replacer,
  insensitive?: boolean,
  escape?: string
): CompiledReplacer {
  const escapeStr = escape ? `(?<!${XRegExp.escape(escape)})` : "";
  if (Array.isArray(entry)) {
    const [key, val] = entry;
    return [XRegExp(escapeStr + XRegExp.escape(key), insensitive ? "i" : undefined), val, "all"];
  }

  // don't escape key
  if ("raw" in entry) {
    const [key, val] = entry.raw;
    return [XRegExp(escapeStr + key, insensitive ? "i" : undefined), val, "all"];
  }

  // is a dict
  const {
    delimiters: [left, right],
    translations,
    escape: newEscape,
  } = entry;

  return [
    XRegExp(`${escapeStr}${XRegExp.escape(left)}(.*?)${XRegExp.escape(right)}`),
    m => XRegExp.replaceEach(
      m.substring(left.length, m.length - right.length),
      translations.map(el => compileKey(el, insensitive, newEscape))
    ),
    "all"];
}
