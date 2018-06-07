'use strict'

/*
 * vars
 */

// libraries
import fs from 'fs'
import xre from 'xregexp'
import yaml from 'js-yaml'

/**
 * @callback matchFunction
 * @param {{inside: string}} match Matched string to manipulate.
 * @returns {string} Transformed string.
 *
 * @callback joinFunction
 * @param {string} left Left bracket.
 * @param {string} match Match text.
 * @param {string} right Right bracket.
 * @returns {string} Joined string.
 *
 * @typedef {[string, string]} KeyTrans
 * @typedef {KeyTrans|KeyNest} KeyConfig
 *
 * @typedef KeyNest
 * @type {object}
 * @property {[string, string]} delimiters Left and right delimiters (eg <, >).
 * Delimited matches are not perfectly recursive.
 * @property {KeyConfig[]} translations What should be done to the text inside.
 *
 * @typedef {[xre, string, 'all']} CompiledKeyTrans
 * @typedef {[xre, matchFunction, 'all']} CompiledKeyNest
 * @typedef {CompiledKeyTrans|CompiledKeyNest} CompiledKeyConfig
 */

// consts
// regex match indices: 2 = key (to lower), 3 = bracket left, 4 = body, 5 = bracket right, (end)
const regex = /(?:(^|\s|`))([A-Za-z]+?)([/[])(\S|\S.*?\S)([/\]])(?=($|\s|[`.,?!;:]))/gm

/** @type {joinFunction} */
const defaultMatchAction = (left, match, right) => left + match + right

/** @type {{keys: CompiledKeyNest, join: ?joinFunction}} */
const matchType = {
  x: {
    keys: readKeys('./x2i/x2i-keys.yaml')
  },
  z: {
    keys: readKeys('./x2i/z2i-keys.yaml')
  },
  p: {
    keys: readKeys('./x2i/apie-keys.yaml'),
    join: (left, match, right) => `*${match}`
  }
}

/*
 * functions
 */

/**
 * Read translation keys from file. Escapes strings first.
 *
 * @param {string} fpath File to key definitions. (yaml, utf8)
 * @returns {CompiledKeyConfig[]} Compiled keys.
 */
function readKeys (fpath) {
  return yaml
    .safeLoad(fs.readFileSync(fpath, 'utf8'))
    .map(compileKey)
}

/**
 * Compiles a plain object into a regexp thing.
 *
 * @param {KeyNest[]} entry Regex and replacement pair, or delimited match object.
 * @returns {CompiledKeyConfig[]} A list of things to execute to transform.
 */
function compileKey (entry) {
  if (Array.isArray(entry)) {
    let [key, val] = entry
    return [xre(xre.escape(key)), val, 'all']
  } else { // is a dict
    try {
      let {
        delimiters: [left, right],
        translations
      } = entry

      translations = translations.map(compileKey)
      return [
        xre(`${xre.escape(left)}(?<inside>.*?)${xre.escape(right)}`),
        (match) => xre.replaceEach(match.inside, translations),
        'all']
    } catch (e) {
      console.log(`${entry} is not an array or a proper object, ignoring`)
      return new Array(2).fill('')
    }
  }
}

/*
 * exports
 */

/**
  * Convert four-tuple of Strings into a specified "official" representation
  *
  * @param {string} key What kind of conversion key is appropriate
  * @param {string} left Left bracket
  * @param {string} match Body
  * @param {string} right Right bracket
  * @returns {?string} Converted item, if any.
  */
export function force (key, left, match, right) {
  let lowerKey = key.toLowerCase()
  if (lowerKey in matchType) {
    let { keys, join } = matchType[lowerKey]
    if (keys) {
      let action = join || defaultMatchAction
      return action(left, xre.replaceEach(match, keys), right)
    }
  }
}

/**
 * Grab all x2i strings in message string.
 * @param {string} content Full message that may or may not contain x2i strings
 * @returns {string} Converted representations
 */
export default function x2i (content) {
  let results = []
  xre.forEach(content, regex, match => {
    let parts = match.slice(2, 6)
    let converted = exports.force(...parts) // x, [, text, ]

    if (converted) {
      results.push(converted)
    }
  })

  return results.join('\n')
}
