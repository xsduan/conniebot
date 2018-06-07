'use strict'

/*
 * vars
 */

// libraries
import Discord from 'discord.js'
import config from 'config'

// local modules
import embed from './embed'

const helpMessage = [
  ['x,z,p[phonetic] or x,z,p/phonemic/',
    'Converts XSAMPA, ZSAMPA, or APIE. Hopefully.'],
  [`${config.get('prefix')}help`,
    'Reply with this message.'],
  ['About these conversions', `<https://en.wikipedia.org/wiki/X-SAMPA>
<http://www.kneequickie.com/kq/Z-SAMPA>`],
  ['\u200B',
    `found a bug or want to suggest a feature?
github: <https://github.com/xsduan/conniebot>
come discuss: https://discord.gg/MvWMH3z`]
]

/**
 * @typedef {Discord.User} User
 * @typedef {Discord.RichEmbed} RichEmbed
 * @typedef {Discord.Channel} Channel
 * @typedef {Promise<Message | Message[]>} SentMessagePromise
 */

/*
 * functions
 */

/**
 * Return Help message, nicely formatted.
 * @param {User} user User to put as head
 * @returns {RichEmbed} Help message
 */
function createEmbed (user) {
  let helpEmbed = new Discord.RichEmbed()
    .setColor(config.get('embeds.colors.success'))
    .setAuthor(user.username, user.avatarURL)
    .setTitle('Commands')

  helpMessage.forEach(entry => helpEmbed.addField(...entry))

  return helpEmbed
}

/*
 * exports
 */

/**
 * Sends a help message.
 *
 * @param {Channel} channel Channel to send to
 * @param {User} user User to put as head
 * @returns {?SentMessagePromise} Whatever message needs handling
 */
export default (channel, user) => embed(channel, createEmbed(user))
