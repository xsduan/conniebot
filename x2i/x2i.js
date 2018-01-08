'use strict'

/*
 *   vars
 */

// data files
const settings = require('../settings.json')

// consts
// regex match indices: 2 = key (to lower), 3 = bracket left, 4 = body, 5 = bracket right, (end)
const regex = /(?:(^|\s))([A-Za-z])([/[])(\S.*?\S)([/\]])/gm
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

function convert (raw, keys) {
  // find & replace, in descending order of substr size
  keys.forEach(function (key) {
    raw = raw.replace(new RegExp(key[0], 'g'), key[1])
  })
  return raw
}

/*
 *  exports
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

exports.grab = function (content) {
  var matches = []
  var match
  var length = 0
  while (length < settings.embeds.timeoutChars && (match = regex.exec(content))) {
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
