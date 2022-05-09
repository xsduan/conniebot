import XRegExp from "xregexp";

import compileKey, { CompiledReplacer, Replacer } from "./compile.js";

export interface IReplaceSource {
  format?: string;
  help: string;
  name: string;
  insensitive?: boolean;
  prefix: string;
  replacers: Replacer[];
}

interface IMatcher {
  keys: CompiledReplacer[];
  join(parts: string[]): string;
}

export default class X2IMatcher {
  /**
   * The alphabet list, for the x/alphabets command.
   */
  public alphabetList: string;

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

  private inlineRegex?: RegExp;
  private tableRegex?: RegExp;
  private replacers: { [k: string]: IMatcher; } = {};

  constructor(matcherSources: IReplaceSource[] = []) {
    this.alphabetList = "";
    for (const source of matcherSources) {
      // an empty file ends up being `undefined`
      if (!source) continue;
      this.register(source);
      this.alphabetList += source.name + ": `" + source.prefix + "/text/` or `" + source.prefix +
        "[text]`: <" + source.help + ">\n";
    }
    this.alphabetList = this.alphabetList.trimEnd();
  }

  private decode(key: string, match: string, left: string, right: string) {
    if (!key) return;
    const lowerKey = key.toLowerCase();

    const { keys, join } = this.replacers[lowerKey];
    const parts = [left, XRegExp.replaceEach(match, keys), right];
    return join(parts);
  }

  private decodeTable(key: string, match: string) {
    if (!key) return;

    const lowerKey = key.toLowerCase();
    const { keys } = this.replacers[lowerKey];

    return "```\n" + XRegExp.replaceEach(match, keys) + "\n```";
  }

  public register(notation: IReplaceSource) {
    this.replacers[notation.prefix] = {
      join: notation.format ? X2IMatcher.joinResult(notation.format) : parts => parts.join(""),
      keys: notation.replacers.map(el => compileKey(el, notation.insensitive)),
    };
  }

  public search(content: string) {
    const results: string[] = [];

    if (!this.inlineRegex) {
      this.inlineRegex = XRegExp(`
# must be preceded by whitespace or surrounded by markdown punctuation, or on its own line
(?<=(^|\\p{White_Space}|(?:^|[^\\\\])[\`*~_]))

# ($2) key
(${Object.keys(this.replacers).map(XRegExp.escape).join("|")})?
# consumes non-tagged brackets to avoid reading the insides accidentally

# ($3) bracket left
([/[])

# ($4) body
(
  \\S                          # single character (eg x/t/)
  |\\S.*?[^_\\p{White_Space}]  # any characters not surrounded by whitespace, ignores _/
)

# ($5) bracket right
([/\\]])

# must be followed by a white space or punctuation (lookahead), not including a bracket
(?=$|[^\\pL\\pN/[\\]])
      `, "gimux");
    }

    if (!this.tableRegex) {
      this.tableRegex = XRegExp(`
# must be preceded by whitespace or surrounded by markdown punctuation, or starting the message
(?<=(^|\\p{White_Space}|(?:^|[^\\\\])[\`*~_]))

# ($2) key
(${Object.keys(this.replacers).map(XRegExp.escape).join("|")})?
# consumes non-tagged brackets to avoid reading the insides accidentally

# bracket left
[/[]

# start table
\\n?\`\`\`\\n

# ($3) body
((?:\`{0,2}[^\`])*)
# don't allow three backticks in a row

# ending table
\\n?\`\`\`\\n?

# bracket right
[/\\]]

# must be followed by a white space or punctuation (lookahead)
(?=$|[^\\pL\\pN])
      `, "giusx");
    }

    XRegExp.forEach(content, this.inlineRegex, match => {
      const parts = match.slice(2, 6);
      if (parts.length === 4) {
        const [k, l, m, r] = parts;
        const converted = this.decode(k, m, l, r); // eg x, text, [, ]

        if (converted) {
          results.push(converted);
        }
      }
    });

    XRegExp.forEach(content, this.tableRegex, match => {
      const parts = match.slice(2, 4);
      if (parts.length === 2) {
        const [k, m] = parts;
        const converted = this.decodeTable(k, m); // eg x, text

        if (converted) {
          results.push(converted);
        }
      }
    });

    return results;
  }
}
