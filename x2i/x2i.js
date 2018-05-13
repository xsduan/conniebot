'use strict'

/*
 * vars
 */

// libraries
const fs = require('fs')
const xre = require('xregexp')
const yaml = require('js-yaml')

// consts
// regex match indices: 2 = key (to lower), 3 = bracket left, 4 = body, 5 = bracket right, (end)
const regex = /(?:(^|\s|`))([A-Za-z]*?)([/[])(\S|\S.*?\S)([/\]])(?=($|\s|`))/gm
const defaultMatchAction = (left, match, right) => left + match + right
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
 * @param {String} fpath File to key definitions. (yaml, utf8)
 */
function readKeys (fpath) {
  return yaml
    .safeLoad(fs.readFileSync(fpath, 'utf8'))
    .map(compileKey)
}

/**
 * Compiles a plain object into a regexp thing.
 *
 * Delimited matches are not perfectly recursive.
 *
 * @param {Array|Object} entry Regex and replacement pair, or delimited match object.
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

      left = xre.escape(left)
      right = xre.escape(right)
      translations = translations.map(compileKey)
      return [xre(`${left}(?<tones>.*?)${right}`), function (match) {
        return xre.replaceEach(match.tones, translations)
      }, 'all']
    } catch (e) {
      console.log(`${entry} is not an array or a proper object, ignoring`)
      return ['', '']
    }
  }
}

/*
 * exports
 */

/**
  * Convert four-tuple of Strings into a specified "official" representation
  *
  * @param {String} key What kind of conversion key is appropriate
  * @param {String} left Left bracket
  * @param {String} match Body
  * @param {String} right Right bracket
  * @returns {String?} Converted item or empty string
  */
exports.force = function (key, left, match, right) {
  let lowerKey = key.toLowerCase()
  if (lowerKey in matchType) {
    let { keys, join: action } = matchType[lowerKey]
    if (keys) {
      action = action || defaultMatchAction
      return action(left, xre.replaceEach(match, keys), right)
    }
  }
}

/**
 * Grab all x2i strings in message string.
 * @param {String} content Full message that may or may not contain x2i strings
 * @returns {String} Converted representations
 */
exports.x2i = function (content) {
  let results = []
  xre.forEach(content, regex, function (match) {
    let parts = match.slice(2, 6)
    let converted = exports.force(...parts)// x, [, text, ]

    results.push(converted || `couldn't understand: ${parts.join('')}`)
  })

  return results.join('\n')
}
