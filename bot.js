'use strict'

/*
 * vars
 */

// libraries
const Discord = require('discord.js')
const config = require('config')
const xre = require('xregexp')

// local modules
const embed = require('./embed/embed')
const x2i = require('./x2i/x2i')
const help = require('./help/help')

// lifetime objects
const bot = new Discord.Client()

/**
 * @typedef {Discord.Message} Message
 * @typedef {Promise<Message | Message[]>} SentMessagePromise
 */

/*
 * functions
 */

/**
 * Prints a formatted message with a related object.
 * @param {string} status Status logged as "(<status>)"
 * @param {*} [message] Object to log after status
 */
function logMessage (status, message) {
  let log = message ? ` ${message}` : ''
  console.log(`(${status})${log}`)
}

/**
 * Convert a message object into a string in the form of guildname: message{0, 100}
 *
 * @param {Message} message
 * @return {string} Message summary (guild name: message snippet)
 */
function messageSummary (message) {
  let guildName = message.guild ? message.guild.name : 'unknown guild'
  return `${guildName}: ${message.content.substr(0, 100)}`
}

/**
 * Acts for a response to a message.
 *
 * @param {Message} message Message to parse for responses
 */
function parse (message) {
  let x2iPromise = x2iExec(message)
  if (x2iPromise) {
    x2iPromise.then(() => logMessage('success:x2i'))
      .catch(err => logMessage('error:x2i', err))
    return
  }

  let promise = command(message)
  if (promise) {
    promise.then(() => logMessage('success:command'))
      .catch(err => logMessage('error:command', err))
  }
}

/**
 * Looks for a reply message.
 *
 * @param {Message} message Message to parse for responses
 * @returns {?SentMessagePromise} Whatever message needs handling
 */
function command (message) {
  let promise

  // commands
  const prefixRegex = xre.build(`(?:^${xre.escape(config.get('prefix'))})(\\S*)`)
  let command = message.content.match(prefixRegex)
  if (command) {
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
  message.channel.send(`I'm alive! (${elapsed} ms)`)
    .then(() => logMessage(`success:command/ping/${elapsed}ms`))
    .catch(err => logMessage('error:command/ping', err))
}

/**
 * Sends an x2i string (but also could be used for simple embeds)
 * @param {Message} message Message to reply to
 * @returns {?SentMessagePromise} Whatever message needs handling
 */
function x2iExec (message) {
  let promise = null

  let results = x2i.x2i(message.content)
  if (results && results.length !== 0) {
    let response = new Discord.RichEmbed()
      .setColor(config.get('embeds.colors.success'))
    let logCode = 'all'

    // check timeout
    let charMax = config.get('embeds.timeoutChars')
    if (results.length > charMax) {
      results = `${results.slice(0, charMax - 1)}…`

      response.addField('Timeout', config.get('embeds.timeoutMessage'))
        .setColor(config.get('embeds.colors.warning'))

      logCode = 'partial'
    }

    response.setDescription(results)

    logMessage(`processed:x2i/${logCode}`, messageSummary(message))
    promise = embed.send(message.channel, response)
  }

  return promise
}

/*
 * main
 */

bot.on('ready', () => {
  console.log('Bot ready. Setting up...')

  if (config.has('activeMessage')) {
    console.log('Changing game status...')
    bot.user.setActivity(config.get('activeMessage'))
      .then(() => console.log('Set game status.'))
      .catch(err => console.log(`Status couldn't be set. ${err}`))
  }
}).on('message', message => {
  if (!message.author.bot) {
    parse(message)
  }
})

if (!config.has('token')) {
  console.error("Couldn't find a token to connect with.")
}

bot.login(config.get('token'))
