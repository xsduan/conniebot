import fs from "fs";
import yaml from "js-yaml";
import OuterXRegExp from "xregexp";

// consts
// regex match indices: 2 = key (to lower), 3 = bracket left, 4 = body, 5 = bracket right, (end)
const regex = /(?:(^|\s|`))([A-Za-z]+?)([/[])(\S|\S.*?\S)([/\]])(?=($|\s|[`.,?!;:]))/gm;

const defaultMatchAction = (left, match, right) => left + match + right;

const matchType = {
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

/*
 * functions
 */

/**
 * Read translation keys from file. Escapes strings first.
 *
 * @param fpath File to key definitions. (yaml, utf8)
 * @returns Compiled keys.
 */
function readKeys(fpath) {
  return yaml
    .safeLoad(fs.readFileSync(fpath, "utf8"))
    .map(compileKey);
}

/**
 * Compiles a plain object into a regexp thing.
 *
 * @param entry Regex and replacement pair, or delimited match object.
 * @returns A list of things to execute to transform.
 */
function compileKey(entry) {
  if (Array.isArray(entry)) {
    const [key, val] = entry;
    return [OuterXRegExp(OuterXRegExp.escape(key)), val, "all"];
  } else { // is a dict
    try {
      const {
        delimiters: [left, right],
        translations,
      } = entry;

      return [
        OuterXRegExp(`${OuterXRegExp.escape(left)}(?<inside>.*?)${OuterXRegExp.escape(right)}`),
        (match) => OuterXRegExp.replaceEach(match.inside, translations.map(compileKey)),
        "all"];
    } catch (e) {
      console.log(`${entry} is not an array or a proper object, ignoring`);
      return new Array(2).fill("");
    }
  }
}

/*
 * exports
 */

/**
 * Convert four-tuple of Strings into a specified "official" representation
 *
 * @param key What kind of conversion key is appropriate
 * @param left Left bracket
 * @param match Body
 * @param right Right bracket
 * @returns Converted item, if any.
 */
export function force(key?, left?, match?, right?) {
  const lowerKey = key.toLowerCase();
  if (lowerKey in matchType) {
    const { keys, join } = matchType[lowerKey];
    if (keys) {
      const action = join || defaultMatchAction;
      return action(left, OuterXRegExp.replaceEach(match, keys), right);
    }
  }
}

/**
 * Grab all x2i strings in message string.
 * @param content Full message that may or may not contain x2i strings
 * @returns Converted representations
 */
export default function x2i(content) {
  const results: any[] = [];
  OuterXRegExp.forEach(content, regex, match => {
    const parts = match.slice(2, 6);
    const converted = force(...parts); // x, [, text, ]

    if (converted) {
      results.push(converted);
    }
  });

  return results.join("\n");
}
