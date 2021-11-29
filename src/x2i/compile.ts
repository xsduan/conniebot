import XRegExp from "xregexp";

interface IRawReplaceKey {
  raw: ReplaceKey;
}

interface INestedKey {
  delimiters: [string, string];
  translations: Replacer[];
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
 */
export default function compileKey(entry: Replacer): CompiledReplacer {
  if (Array.isArray(entry)) {
    const [key, val] = entry;
    return [XRegExp(XRegExp.escape(key)), val, "all"];
  }

  // don't escape key
  if ("raw" in entry) {
    const [key, val] = entry.raw;
    return [XRegExp(key), val, "all"];
  }

  // is a dict
  const {
    delimiters: [left, right],
    translations,
  } = entry;

  return [
    XRegExp(`${XRegExp.escape(left)}(.*?)${XRegExp.escape(right)}`),
    m => XRegExp.replaceEach(
      // Apparently captures don't work the way they used to
      m.substring(left.length, m.length - right.length),
      translations.map(compileKey)
    ),
    "all"];
}
