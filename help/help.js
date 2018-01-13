'use strict'

/*
 * vars
 */

// libraries
const Discord = require('discord.js')

// local modules
const embed = require('../embed/embed.js')

// data files
var cfg = require('config')

const help = [
  ['x,z,p[phonetic] or x,z,p/phonemic/',
    'Converts XSAMPA, ZSAMPA, or APIE. Hopefully.'],
  [cfg.get('prefix') + 'help',
    'Reply with this message.'],
  ['About these conversions', `https://en.wikipedia.org/wiki/X-SAMPA
http://www.kneequickie.com/kq/Z-SAMPA
https://pastebin.com/TEwBxfF5`],
  ['\u200B',
    'found a bug or want to suggest a feature?\ngithub: https://github.com/xsduan/conniebot']
]

/*
 * functions
 */

/**
 * Return Help message, nicely formatted.
 * @param {User} user User to put as head
 * @returns {RichEmbed} Help message
 */
function createEmbed (user) {
  var helpEmbed = new Discord.RichEmbed()
    .setColor(cfg.get('embeds.colors.success'))
    .setAuthor(user.username, user.avatarURL)
    .setTitle('Commands')

  help.forEach(function (entry) {
    helpEmbed.addField(...entry)
  })

  return helpEmbed
}

/*
 * exports
 */

/**
 * Sends a help message.
 * @param {Channel} channel Channel to send to
 * @param {User} user Who the sender is
 * @returns {(Promise<(Message|Array<Message>)>)|null} Whatever message needs handling
 */
exports.help = function (channel, user) {
  return embed.send(channel, createEmbed(user))
}
