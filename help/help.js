'use strict'

/*
 *   vars
 */

// local modules
const embed = require('../embed/embed.js')

// data files
const settings = require('../settings.json')

const help = [
  {
    name: 'x,z,p[phonetic] or x,z,p/phonemic/',
    value: 'Converts XSAMPA, ZSAMPA, or APIE to IPA. Hopefully.'
  },
  {
    name: settings.prefix + 'xsampa, ' + settings.prefix + 'zsampa, or ' + settings.prefix + 'apie',
    value: 'Converts the rest of the message into their respective formats.',
  },
  {
    name: settings.prefix + 'help',
    value: 'Reply with this message.'
  },
  {
    name: '\u200B',
    value: 'found a bug or want to suggest a feature?\ngithub: https://github.com/xsduan/conniebot'
  }
]

/*
 *  exports
 */

exports.embed = function (user) {
  return {
    embed: {
      color: settings.embeds.colors.success,
      author: {
        name: user.username,
        icon_url: user.avatarURL
      },
      title: 'Commands',
      fields: help
    }
  }
}

exports.help = function (channel, user) {
  return embed.send(channel, exports.embed(user))
}
