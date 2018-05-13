'use strict'

/*
 * vars
 */

// libraries
const Discord = require('discord.js')
var cfg = require('config')

// local modules
const embed = require('./embed/embed.js')
const x2i = require('./x2i/x2i.js')
const help = require('./help/help.js')

// lifetime objects
const bot = new Discord.Client()

/*
 * functions
 */

/**
 * Prints a formatted message with a related object.
 * @param {String} status Status logged as "(<status>)"
 * @param {Object} [message] Optional object to log after status
 */
function logMessage (status, message = null) {
  var log = '(' + status + ')'

  if (message != null) {
    log += ' ' + message
  }

  console.log(log)
}

/**
 * Convert a message object into a string in the form of guildname: message{0, 100}
 *
 * @param {Message} message
 */
function messageSummary (message) {
  return message.guild.name + ': ' + message.content.substr(0, 100)
}

/**
 * Acts for a response to a message.
 * @param {Message} message Message to parse for responses
 */
function parse (message) {
  var x2iPromise = x2iExec(message)
  if (x2iPromise != null) {
    x2iPromise.then(() => logMessage('success:x2i'))
      .catch(err => logMessage('error:x2i', err))
    return
  }

  var promise = command(message)
  if (promise !== null) {
    promise.then(() => logMessage('success:command'))
      .catch(err => logMessage('error:command', err))
  }
}

/**
 * Looks for a message.
 * @param {Message} message Message to parse for responses
 * @returns {(Promise<(Message|Array<Message>)>)|null} Whatever message needs handling
 */
function command (message) {
  var promise = null

  // commands
  const prefixRegex = new RegExp('(?:^' + cfg.get('prefix') + ')(\\S*)')
  var command = message.content.match(prefixRegex)
  if (command !== null) {
    command = command[1]

    switch (command) {
      // ping command is special case response.
      case 'ping':
        ping(message)
        break
      // all the following commands are handled the same.
      case 'help':
        promise = help.help(message.channel, bot.user)
        break
    }

    logMessage('processed:command/' + command, messageSummary(message))
  }

  return promise
}

/**
 * Tries to respond in a timely fashion (e.g. to acknowledge that it's alive).
 * @param {Message} message Message to respond to (read time)
 */
function ping (message) {
  const elapsed = new Date().getTime() - message.createdTimestamp
  message.channel.send('I\'m alive! (' + elapsed + ' ms)')
    .then(() => logMessage('success:command/ping/' + elapsed + 'ms'))
    .catch(err => logMessage('error:command/ping', err))
}

/**
 * Sends an x2i string (but also could be used for simple embeds)
 * @param {Message} message Message to reply to
 * @returns {(Promise<(Message|Array<Message>)>)|null} Whatever message needs handling
 */
function x2iExec (message) {
  var promise = null

  var results = x2i.grab(message.content)
  if (results !== undefined && results.length !== 0) {
    var response = new Discord.RichEmbed()
      .setColor(cfg.get('embeds.colors.success'))
    var logCode = 'all'

    // check timeout
    var timedOut = results.length > cfg.get('embeds.timeoutChars')
    if (timedOut) {
      results = results.slice(0, cfg.get('embeds.timeoutChars') - 1) + '…'

      response.addField('Timeout', cfg.get('embeds.timeoutMessage'))
        .setColor(cfg.get('embeds.colors.warning'))

      logCode = 'partial'
    }

    response.setDescription(results)

    logMessage('processed:x2i/' + logCode, messageSummary(message))
    promise = embed.send(message.channel, response)
  }

  return promise
}

/*
 * main
 */

bot.on('ready', () => {
  console.log('Bot ready. Setting up...')

  if (cfg.has('activeMessage')) {
    console.log('Changing game status...')
    bot.user.setActivity(cfg.get('activeMessage'))
      .then(() => console.log('Set game status.'))
      .catch(err => console.log('Game couldn\'t be set. ' + err))
  }
}).on('message', message => {
  if (!message.author.bot) {
    parse(message)
  }
})

if (!cfg.has('token')) {
  console.error('Couldn\'t find a token to connect with.')
}

bot.login(cfg.get('token'))
