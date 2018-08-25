import fs from "fs";
import yaml from "js-yaml";
import OuterXRegExp from "xregexp";

interface IRawReplaceKey {
  raw: ReplaceKey;
}

interface INestedKey {
  delimiters: [string, string];
  translations: Replacer[];
}

type ReplaceKey = [string, string];
type Replacer = ReplaceKey | INestedKey | IRawReplaceKey;

type CompiledReplacer = [
  RegExp,
  string | ((m: { [key: string]: string }) => string),
  string
];

interface IMatchInstructions {
  keys: CompiledReplacer[];
  join?(left: string, match: string, right: string): string;
}

const regex = OuterXRegExp(
  `(?:(^|[\`\\p{White_Space}]))   # must be preceded by whitespace or surrounded by code brackets
  ([A-Za-z]+)                     # key, to lower (2)
  ([/[])                          # bracket left  (3)
  (\\S|\\S.*?\\S)                 # body          (4)
  ([/\\]])                        # bracket right (5)
  (?=$|[\`\\p{White_Space}\\pP])  # must be followed by a white space or punctuation`,
  "gmx");

const defaultMatchAction = (left: string, match: string, right: string) => left + match + right;

const matchType: { [key: string]: IMatchInstructions } = {
  p: {
    join: (_, match) => `*${match}`,
    keys: readKeys("./x2i/apie-keys.yaml"),
  },
  x: {
    keys: readKeys("./x2i/x2i-keys.yaml"),
  },
  z: {
    keys: readKeys("./x2i/z2i-keys.yaml"),
  },
};

/**
 * Read translation keys from file. Escapes strings first.
 *
 * @param fpath File to key definitions. (yaml, utf8)
 * @returns Compiled keys.
 */
function readKeys(fpath) {
  return yaml
    .safeLoad(fs.readFileSync(fpath, "utf8"))
    .map(compileKey)
    .filter(Boolean) as CompiledReplacer[];
}

/**
 * Compiles a plain object into a regexp thing.
 *
 * @param entry Regex and replacement pair, or delimited match object.
 */
function compileKey(entry: Replacer): CompiledReplacer | undefined {
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
  try {
    const {
      delimiters: [left, right],
      translations,
    } = entry;

    return [
      OuterXRegExp(`${OuterXRegExp.escape(left)}(?<inside>.*?)${OuterXRegExp.escape(right)}`),
      m => OuterXRegExp.replaceEach(
        m.inside,
        translations.map(compileKey) as (RegExp | string)[][],
      ),
      "all"];
  } catch (e) {
    console.log(`${entry} is not an array or a proper object, ignoring`);
  }
}

/**
 * Convert four-tuple of Strings into a specified "official" representation
 *
 * @param key What kind of conversion key is appropriate
 * @param left Left bracket
 * @param match Body
 * @param right Right bracket
 * @returns Converted item, if any.
 */
export function force(key: string, left: string, match: string, right: string) {
  const lowerKey = key.toLowerCase();
  if (lowerKey in matchType) {
    const { keys, join } = matchType[lowerKey];
    if (keys) {
      const action = join || defaultMatchAction;
      // need to use `as (RegExp | string)[][]` because the provided typings are too generic
      return action(left, OuterXRegExp.replaceEach(match, keys as (RegExp | string)[][]), right);
    }
  }
}

/**
 * Grab all x2i strings in message string.
 *
 * @param content Full message that may or may not contain x2i strings
 * @returns Converted representations
 */
export default function x2i(content: string) {
  const results: string[] = [];
  OuterXRegExp.forEach(content, regex, match => {
    const parts = match.slice(2, 6);
    if (parts.length === 4) {
      const [k, l, m, r] = parts;
      const converted = force(k, l, m, r); // eg x, [, text, ]

      if (converted) {
        results.push(converted);
      }
    }
  });

  return results.join("\n");
}
