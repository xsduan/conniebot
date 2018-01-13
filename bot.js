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
 * Acts for a response to a message.
 * @param {Message} message Mssage to parse for responses
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

    const forceX2i = function (type) {
      return x2iSend(message.channel,
        x2i.force(type, '[', message.content.split(' ').slice(1).join(' '), ']'))
    }

    switch (command) {
      // ping command is special case response.
      case 'ping':
        ping(message)
        break
      // all the following commands are handled the same.
      case 'help':
        promise = help.help(message.channel, bot.user)
        break
      case 'xsampa':
        promise = forceX2i('x')
        break
      case 'zsampa':
        promise = forceX2i('z')
        break
      case 'apie':
        promise = forceX2i('p')
    }

    logMessage('processed:command/' + command)
  } else {
    logMessage('ignored:command')
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
 * Links x2i.grab(String) to a message channel.
 * @param {Message} message Message to look for an x2i string in
 * @returns {(Promise<(Message|Array<Message>)>)|null} Whatever message needs handling
 */
function x2iExec (message) {
  return x2iSend(message.channel, x2i.grab(message.content))
}

/**
 * Sends an x2i string (but also could be used for simple embeds)
 * @param {Channel} channel Channel to send message to
 * @param {String} results String to put in description (body text)
 * @returns {(Promise<(Message|Array<Message>)>)|null} Whatever message needs handling
 */
function x2iSend (channel, results) {
  if (results !== undefined && results.length !== 0) {
    var response = new Discord.RichEmbed()
      .setColor(cfg.get('embeds.colors.success'))
    var logCode = 'all'

    // check timeout
    var timedOut = results.length > cfg.get('embeds.timeoutChars')
    if (timedOut) {
      results = results.slice(0, cfg.get('embeds.timeoutChars') - 1) + '…'

      response.addField('Timeout', cfg.get('embeds.timeoutChars'))
        .setColor(cfg.get('embeds.colors.warning'))

      logCode = 'partial'
    }

    response.setDescription(results)

    logMessage('processed:x2i/' + logCode)
    return embed.send(channel, response)
  } else {
    logMessage('ignored:x2i')
    return null
  }
}

/*
 * main
 */

bot.on('ready', () => {
  console.log('Bot ready. Setting up...')

  if (cfg.has('activeMessage')) {
    console.log('Changing game status...')
    bot.user.setGame(cfg.get('activeMessage'))
      .then(() => console.log('Set game status.'))
      .catch(err => console.log('Game couldn\'t be set. ' + err))
  }
})

bot.on('message', message => {
  logMessage('-start ' + message.createdTimestamp + '-')
  if (!message.author.bot) {
    parse(message)
  } else {
    logMessage('ignored:bot')
  }

  logMessage('-processed ' + message.createdTimestamp + '-')

  // separate message return statuses in logs
  console.log()
})

if (!cfg.has('token')) {
  console.error('Couldn\'t find a token to connect to the token.')
}

bot.login(cfg.get('token'))
