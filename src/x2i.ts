import fs from "fs";
import path from "path";

import c from "config";
import yaml from "js-yaml";
import OuterXRegExp from "xregexp";

import { log, resolveDatapath } from "./utils";

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
  fullName: string;
  keys: CompiledReplacer[];
  join(parts: string[]): string;
}

const regex = OuterXRegExp(`
# must be preceded by whitespace or surrounded by code brackets, or on its own line
(?:(^|[\`\\p{White_Space}]))

# ($2) key, to lower
([A-Za-z]*) # consumes non-tagged brackets to avoid reading the insides accidentally
# ($3) bracket left
([/[])
# ($4) body
(
  \\S                         # single character (eg x/t/)
  |\\S.*?[^_\\p{White_Space}]  # any characters not surrounded by whitespace, ignores _/
)
# ($5) bracket right
([/\\]])

# must be followed by a white space or punctuation (lookahead)
(?=$|[\`\\p{White_Space}\\pP])
  `, "gmx");

const matchType = loadKeys();

/**
 * Create a callback that joins a result based on "template" string ($0 for global, $1, $2, ...)
 */
function joinResult(format: string) {
  return (parts: string[]) => OuterXRegExp.replaceEach(format, [
    [/\$0/g, parts.join(""), "all"],
    ...parts.map((p, i) => [OuterXRegExp(OuterXRegExp.escape(`$${i + 1}`)), p, "all"]),
  ]);
}

/**
 * Load keys from files in the x2i data folder.
 */
function loadKeys() {
  const x2iDir = resolveDatapath(c.get<string>("x2i"));
  return fs.readdirSync(x2iDir).reduce(
    (acc, fname) => {
      const { prefix, format, replacers } = yaml.safeLoad(
        fs.readFileSync(path.resolve(x2iDir, fname), "utf8"));
      acc[prefix] = {
        fullName: path.basename(fname, path.extname(fname)),
        join: format && joinResult(format),
        keys: replacers.map(compileKey).filter(Boolean) as CompiledReplacer[],
      };
      return acc;
    },
    {} as { [key: string]: IMatchInstructions },
  );
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
  } catch {
    log("error", `${entry} is not an array or a proper object, ignoring`);
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
  if (!(lowerKey in matchType)) return;

  const { keys, join } = matchType[lowerKey];
  if (keys) {
    // need to use `as (RegExp | string)[][]` because the provided typings are too generic
    const parts = [left, OuterXRegExp.replaceEach(match, keys as (RegExp | string)[][]), right];
    return join ? join(parts) : parts.join("");
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
