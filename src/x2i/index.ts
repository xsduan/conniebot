import OuterXRegExp from "xregexp";

import compileKey, { CompiledReplacer, Replacer } from "./compile";

interface IReplaceSource {
  prefix: string;
  format: string;
  replacers: Replacer[];
}

interface IMatcher {
  keys: CompiledReplacer[];
  join(parts: string[]): string;
}

export default class X2IMatcher {
  /**
   * Create a callback that joins a result based on "template" string ($0 for global, $1, $2, ...)
   */
  private static joinResult(format: string) {
    return (parts: string[]) => format.replace(/\$(\d+)/g, (m, indexStr) => {
      const index = parseInt(indexStr, 10);
      if (index === 0) {
        return parts.join("");
      }
      return parts[index];
    });
  }

  private static matchRegex = OuterXRegExp(`
  # must be preceded by whitespace or surrounded by code brackets, or on its own line
  (?:(^|[\`\\p{White_Space}]))

  # ($2) key, to lower
  ([A-Za-z]*) # consumes non-tagged brackets to avoid reading the insides accidentally
  # ($3) bracket left
  ([/[])
  # ($4) body
  (
    \\S                          # single character (eg x/t/)
    |\\S.*?[^_\\p{White_Space}]  # any characters not surrounded by whitespace, ignores _/
  )
  # ($5) bracket right
  ([/\\]])

  # must be followed by a white space or punctuation (lookahead)
  (?=$|[\`\\p{White_Space}\\pP])
    `, "gmx");
  private replacers: { [k: string]: IMatcher; } = {};

  constructor(matcherSources: IReplaceSource[] = []) {
    for (const source of matcherSources) {
      this.register(source);
    }
  }

  private decode(key: string, match: string, [left, right]: [string, string]) {
    const lowerKey = key.toLowerCase();
    if (!(lowerKey in this.replacers)) return;

    const { keys, join } = this.replacers[lowerKey];
    // need to use `as (RegExp | string)[][]` because the provided typings are too generic
    const parts = [left, OuterXRegExp.replaceEach(match, keys as (RegExp | string)[][]), right];
    return join(parts);
  }

  public register({ prefix, format, replacers }: IReplaceSource) {
    this.replacers[prefix] = {
      join: format ? X2IMatcher.joinResult(format) : parts => parts.join(""),
      keys: replacers.map(compileKey),
    };
  }

  public search(content: string) {
    const results: string[] = [];
    OuterXRegExp.forEach(content, X2IMatcher.matchRegex, match => {
      const parts = match.slice(2, 6);
      if (parts.length === 4) {
        const [k, l, m, r] = parts;
        const converted = this.decode(k, m, [l, r]); // eg x, [, text, ]

        if (converted) {
          results.push(converted);
        }
      }
    });

    return results;
  }
}
