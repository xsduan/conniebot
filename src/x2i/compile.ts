import OuterXRegExp from "xregexp";

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
  string | ((m: { [key: string]: string }) => string),
  string
];

/**
 * Compiles a plain object into a regexp thing.
 *
 * @param entry Regex and replacement pair, or delimited match object.
 */
export default function compileKey(entry: Replacer): CompiledReplacer {
  if (Array.isArray(entry)) {
    const [key, val] = entry;
    return [OuterXRegExp(OuterXRegExp.escape(key)), val, "all"];
  }

  // don't escape key
  if ("raw" in entry) {
    const [key, val] = entry.raw;
    return [OuterXRegExp(key), val, "all"];
  }

  // is a dict
  const {
    delimiters: [left, right],
    translations,
  } = entry;

  return [
    OuterXRegExp(`${OuterXRegExp.escape(left)}(?<inside>.*?)${OuterXRegExp.escape(right)}`),
    m => OuterXRegExp.replaceEach(m.inside, translations.map(compileKey) as (RegExp | string)[][]),
    "all"];
}
