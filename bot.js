'use strict'

/*
 *   vars
 */

// libraries
const Discord = require('discord.js')

// local modules
const embed = require('./embed/embed.js')
const x2i = require('./x2i/x2i.js')
const help = require('./help/help.js')

// data files
const auth = require('./auth.json')
const settings = require('./settings.json')

// lifetime objects
const bot = new Discord.Client()

/*
 * functions
 */

function logMessage (status, message = null) {
  var log = '(' + status + ')'

  if (message != null) {
    log += ' ' + message
  }

  console.log(log)
}

function parse (message) {
  var promise = command(message)
  if (promise !== null) {
    promise.then(() => logMessage('success:command'))
      .catch(err => logMessage('error:command', err))
    return
  }

  var x2iPromise = x2iExec(message)
  if (x2iPromise != null) {
    x2iPromise.then(() => logMessage('success:x2i'))
      .catch(err => logMessage('error:x2i', err))
  }
}

function command (message) {
  var promise = null

  // commands
  const prefixRegex = new RegExp('(?:^' + settings.prefix + ')(\\S*)')
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

function ping (message) {
  const elapsed = new Date().getTime() - message.createdTimestamp
  message.channel.send('I\'m alive! (' + elapsed + ' ms)')
    .then(() => logMessage('success:command/ping/' + elapsed + 'ms'))
    .catch(err => logMessage('error:command/ping', err))
}

function x2iExec (message) {
  return x2iSend(message.channel, x2i.grab(message.content))
}

function x2iSend (channel, results) {
  if (results !== undefined && results.length !== 0) {
    var response = {
      color: settings.embeds.colors.success
    }
    var logCode = 'all'

    // check timeout
    var timedOut = results.length > settings.embeds.timeoutChars
    if (timedOut) {
      response.fields = [{ name: 'Timeout', value: settings.embeds.timeoutMessage }]
      results = results.slice(0, settings.embeds.timeoutChars - 1) + '…'

      logCode = 'partial'
      response.color = settings.embeds.colors.warning
    }

    response.description = results

    logMessage('processed:x2i/' + logCode)
    return embed.send(channel, { embed: response })
  } else {
    logMessage('ignored:x2i')
    return null
  }
}

/*
 *   main
 */

bot.on('ready', () => {
  console.log('Bot ready. Setting up...')

  console.log('Changing game status...')
  bot.user.setGame(settings.activeMessage)
    .then(() => console.log('Set game status.'))
    .catch(err => console.log('Game couldn\'t be set. ' + err))
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

bot.login(auth.token)
