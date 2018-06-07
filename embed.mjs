'use strict'

/*
 * vars
 */

// libraries
import config from 'config'

/**
 * @typedef {Discord.RichEmbed} RichEmbed
 * @typedef {Discord.Channel} Channel
 * @typedef {Promise<Message | Message[]>} SentMessagePromise
 */

/*
 * functions
 */

/**
 * Grabs body from RichEmbed, optionally discarding headers
 *
 * @param {RichEmbed} message Message to grab body text from
 * @param {boolean} [headersImportant] Should keep headers?
 * @returns {string} Body of RichEmbed
 */
function handleBody (message, headersImportant) {
  return (message.fields || []).map(field => {
    let fieldString = headersImportant ? `**${field.name}**\n` : ''
    return `${fieldString}${field.value}`
  })
}

/**
 * Convert RichEmbed to String
 *
 * @param {RichEmbed} message Message to convert
 * @param {boolean} [headersImportant] Should keep headers?
 * @returns {string} String representation of RichEmbed
 */
function strip (message, headersImportant) {
  let title = message.title ? `**${message.title}**\n` : ''
  let desc = message.description ? `${message.description}\n` : ''
  let body = handleBody(message, headersImportant)

  return `${title}${desc}\n${body}`
}

/*
 * exports
 */

/**
  * Send message to channel
  *
  * @param {Channel} channel Channel to send message to
  * @param {RichEmbed|string} message Message to send
  * @param {boolean} headersImportant Should keep headers if converted?
  * @returns {?SentMessagePromise} Whatever message needs handling
  */
export default function send (channel, message, headersImportant = true) {
  return channel.send(config.get('embeds.active')
    ? message
    : strip(message, headersImportant))
}
