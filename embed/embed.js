'use strict'

/*
 * vars
 */

// data files
const settings = require('../settings.json')

/*
 * functions
 */

 /**
  * Grab title from RichEmbed
  * @param {RichEmbed} message Message to grab title from
  * @returns {String} Title of RichEmbed
  */
function handleTitle (message) {
  var title = ''
  if (message.title !== undefined) {
    title = '**' + message.title + '**\n'
  }
  return title
}

/**
 * Grab description from RichEmbed
 * @param {RichEmbed} message Message to grab description from
 * @returns {String} Description of RichEmbed
 */
function handleDescription (message) {
  return message.description !== undefined
    ? message.description + '\n\n'
    : '\n'
}

/**
 * Grabs body from RichEmbed, optionally discarding headers
 * @param {RichEmbed} message Message to grab body text from
 * @param {boolean} [headersImportant] Should keep headers?
 * @returns {String} Body of RichEmbed
 */
function handleBody (message, headersImportant) {
  var body = []
  if (message.fields !== undefined) {
    message.fields.forEach(function (field) {
      var fieldString = ''

      if (headersImportant) {
        fieldString += '**' + field.name + '**\n'
      }

      body.push(fieldString + field.value)
    })
  }
  return body.join('\n\n')
}

/**
 * Choose appropriate message format depending on settings.embeds.active
 * @param {RichEmbed} message Message to convert
 * @param {boolean} [headersImportant] Should keep headers?
 * @returns {(RichEmbed|String)} Message converted to appropriate format
 */
function output (message, headersImportant = true) {
  return settings.embeds.active
    ? message
    : strip(message, headersImportant)
}

/**
 * Convert RichEmbed to String
 * @param {RichEmbed} message Message to convert
 * @param {boolean} [headersImportant] Should keep headers?
 * @returns {String} String representation of RichEmbed
 */
function strip (message, headersImportant = true) {
  return handleTitle(message) + handleDescription(message) + handleBody(message, headersImportant)
}

/*
 * exports
 */

 /**
  * Send message to channel
  * @param {Channel} channel Channel to send message to
  * @param {(RichEmbed|String)} message Message to send
  * @param {boolean} headersImportant Should keep headers if converted?
  * @returns {(Promise<(Message|Array<Message>)>)|null} Whatever message needs handling
  */
exports.send = function (channel, message, headersImportant = true) {
  return channel.send(output(message, headersImportant))
}
