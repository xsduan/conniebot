'use strict'

/*
 *   vars
 */

// data files
const settings = require('../settings.json')

/*
 * functions
 */

function handleTitle (message) {
  var title = ''
  if (message.title !== undefined) {
    title = '**' + message.title + '**\n'
  }
  return title
}

function handleDescription (message) {
  return message.description !== undefined
    ? message.description + '\n\n'
    : '\n'
}

function handleBody (message, headersImportant) {
  var body = ''
  if (message.fields !== undefined) {
    message.fields.forEach(function (field) {
      var fieldString = ''

      if (headersImportant) {
        fieldString += '**' + field[0] + '**\n'
      }

      body += fieldString + field[1] + '\n'
    })
  }
  return body
}

function output (message, headersImportant = true) {
  return settings.embeds.active
    ? message
    : strip(message, headersImportant)
}

function strip (message, headersImportant = true) {
  return handleTitle(message) + handleDescription(message) + handleBody(message, headersImportant)
}

/*
 *  exports
 */

exports.send = function (channel, message, headersImportant = true) {
  return channel.send(output(message, headersImportant))
}
