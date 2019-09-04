/**
 * Simple string formatting (just for our purposes, so very limited).
 *
 * Property access takes two forms – `{foo.bar}` and `{foo[bar]}`. Top level array access is not
 * allowed because that's weird.
 *
 * @param target String to format.
 * @param args Arbitrary object to format from.
 */
export function strFormat(target: string, args: object) {
  return target.replace(
    /{([A-Za-z_0-9]+?(?:\.[A-Za-z_0-9]+?|\[[A-Za-z_0-9]+\])*)}/g,
    (m, objPath) => {
      let curr: any = args;
      // technically there could be some odd sequences we allow here, but our path regex ensures
      // that it'll be sensible, at the very least.
      for (const tok of objPath.split(/[\.\[\]]/)) {
        try {
          curr = curr[tok];
        } catch {
          return "";
        }
      }
      return `${curr}`;
    },
  );
}

/**
 * Perform `strFormat` on a plain object. (May work for prototyped objects, but may be wonky, no
 * guarantees.)
 *
 * @param helpSrc Source to format.
 * @param env Variables that formatting can reference.
 */
export function formatObject(helpSrc: object | string, env: any) {
  return (function _resolve(subObject: any) {
    switch (typeof subObject) {
      case "string":
        return strFormat(subObject, env);
      case "object":
        if (!subObject) return `${subObject}`; // null is object, please ignore.

        const resolved: { [k: string]: any } = {};
        for (const [k, v] of Object.entries(subObject)) {
          if (Array.isArray(v)) {
            resolved[k] = v.map(_resolve);
          } else if (v && typeof v === "string" || typeof v === "object") {
            resolved[k] = _resolve(v);
          } else {
            resolved[k] = v;
          }
        }
        return resolved;
      default:
        return `${subObject}`;
    }
  })(helpSrc);
}
