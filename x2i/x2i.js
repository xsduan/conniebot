'use strict'

/*
 * vars
 */

// data files
const cfg = require('config')

// consts
// regex match indices: 2 = key (to lower), 3 = bracket left, 4 = body, 5 = bracket right, (end)
const regex = /(?:(^|\s))([A-Za-z])([/[])(\S|\S.*?\S)([/\]])/gm
const matchType = {
  'x': {
    keys: require('./x2i-keys.json'),
    join: function (left, match, right) {
      return left + match + right
    }
  },
  'z': {
    keys: require('./z2i-keys.json'),
    join: function (left, match, right) {
      return left + match + right
    }
  },
  'p': {
    keys: require('./apie-keys.json'),
    join: function (left, match, right) {
      return '*' + match
    }
  }
}

/*
 * functions
 */

 /**
  * Find and replace all strings in keys
  * @param {String} raw Raw string to convert
  * @param {String[][]} keys Keys to find and replace
  * @returns {String} Converted string
  */
function convert (raw, keys) {
  // find & replace, in descending order of substr size
  keys.forEach(function (key) {
    raw = raw.replace(new RegExp(key[0], 'g'), key[1])
  })
  return raw
}

/*
 * exports
 */

 /**
  * Convert four-tuple of Strings into a specified "official" representation
  * @param {String} key What kind of conversion key is appropriate
  * @param {String} left Left bracket
  * @param {String} match Body
  * @param {String} right Right bracket
  * @returns {String} Converted item or empty string
  */
exports.force = function (key, left, match, right) {
  var matchActions = matchType[key.toLowerCase()]
  if (matchActions !== undefined) {
    match = convert(match, matchActions.keys)
    return matchActions.join(left, match, right)
  } else {
    return ''
  }
}

/**
 * Grab all x2i strings in message string.
 * @param {String} content Full message that may or may not contain x2i strings
 * @returns {String} Converted representations
 */
exports.grab = function (content) {
  var matches = []
  var match
  var length = 0
  while (length < cfg.get('embeds.timeoutChars') && (match = regex.exec(content))) {
    match = match.slice(2)
    if (match[1] !== '') {
      const converted = exports.force(...match)
      if (converted !== '') {
        length += converted.length
        matches.push(converted)
      }
    }
  }
  return matches.join('\n')
}
