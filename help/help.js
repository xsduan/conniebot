'use strict'

/*
 *   vars
 */

// libraries
const Discord = require('discord.js')

// local modules
const embed = require('../embed/embed.js')

// data files
const settings = require('../settings.json')

const help = [
  ['x,z,p[phonetic] or x,z,p/phonemic/',
    'Converts XSAMPA, ZSAMPA, or APIE to IPA. Hopefully.' ],
  [settings.prefix + 'xsampa, ' + settings.prefix + 'zsampa, or ' + settings.prefix + 'apie',
    'Converts the rest of the message into their respective formats.'],
  [settings.prefix + 'help',
    'Reply with this message.'],
  ['\u200B',
    'found a bug or want to suggest a feature?\ngithub: https://github.com/xsduan/conniebot']
]

/*
 *  exports
 */

exports.embed = function (user) {
  var helpEmbed = new Discord.RichEmbed()
    .setColor(settings.embeds.colors.success)
    .setAuthor(user.username, user.avatarURL)
    .setTitle('Commands')

  help.forEach(function (entry) {
    helpEmbed.addField(...entry)
  })

  return helpEmbed
}

exports.help = function (channel, user) {
  return embed.send(channel, exports.embed(user))
}
