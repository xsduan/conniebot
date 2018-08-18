'use strict'

/*
 * vars
 */

// libraries
const config = require('config')
const Discord = require('discord.js')
const NeDB = require('nedb')
const xre = require('xregexp')

// local modules
const embed = require('./embed')
const x2i = require('./x2i')
const help = require('./help')

// lifetime objects
const bot = new Discord.Client()
const db = new NeDB({ filename: config.get('database'), autoload: true })
const commands = {
  ping: ping, // ping command is special case response.
  help: message => help.help(message.channel, bot.user),
  notif: setChannel
}

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
  const prefixRegex = xre
    .build(`(?:^${xre.escape(config.get('prefix'))})(\\S*) ?(.*)`)
  let toks = message.content.match(prefixRegex)
  if (toks) {
    let [, cmd, args] = toks
    if (cmd in commands) {
      promise = commands[cmd](message, ...args.split(' '))
    }

    logMessage('processed:command/' + cmd, messageSummary(message))
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

/**
 * Sets a event notification channel.
 *
 * @param {Message} message Command message.
 * @param {string} event Event to register.
 * @returns {SentMessagePromise} Whatever message needs handling.
 */
function setChannel (message, event) {
  if (message.author.id === config.get('owner')) {
    if (!event) {
      return message.channel.send('Sorry, you need to specify an event.')
    }

    console.log(message.channel.id)
    db.update({ config: config.get('owner') },
      { $set: { [`notifs.${event}`]: message.channel.id } },
      { upsert: true },
      (err, numReplaced) => {
        if (err) {
          message.channel
            .send('Something went wrong while trying to set notifications.')
          return console.log(err)
        }
        console.log(`Updated ${numReplaced} for ${event} notification.`)
      })
    return message.channel
      .send(`Got it! Will send notifications for ${event} to ${message.channel}.`)
  }
  return message.reply("Sorry, but you don't have permissions to do that.")
}

/**
 * Update activity of bot.
 */
function updateActivity () {
  if (config.has('activeMessage')) {
    console.log('Changing game status...')
    bot.user.setActivity(config.get('activeMessage'))
      .then(() => console.log('Set game status.'))
      .catch(err => console.log(`Status couldn't be set. ${err}`))
  }
}

/**
 * Send notification to channel for reboot.
 */
function notifyRestart () {
  if (config.has('owner')) {
    db.findOne(
      { config: config.get('owner') },
      { 'notifs.restart': 1, _id: 0 },
      (err, doc) => {
        if (err) {
          return console.log(err)
        }

        if (!doc || !Object.keys(doc).length) {
          return console.log("Couldn't find channel to notify.")
        }

        let channel = bot.channels.get(doc.notifs.restart)

        channel.send(`Rebooted at ${new Date()}.`)
          .then(() => {
            console.log(`Notified ${channel} (#${channel.name}) of restart.`)
          })
          .catch(err => console.log(err))
      })
  } else {
    console.log("Owner key doesn't exist.")
  }
}

function notifyNewErrors () {
  // TODO: use best practices, don't c+p code
  db.find({ error: 'unsentErrors' }, (err, docs) => {
    let unsentErrors
    if (docs && docs.length) {
      unsentErrors = docs.errors
    } else {
      unsentErrors = []
    }

    if (err) {
      return console.log(err)
    }

    if (!unsentErrors.length) {
      return
    }

    // oh good, callback hell
    db.findOne(
      { config: config.get('owner') },
      { 'notifs.errors': 1, _id: 0 },
      async (err, { notifs: { errors: errorChannel } = {} }) => {
        if (err) {
          return console.log(err)
        }

        if (!errorChannel) {
          return console.log("Couldn't find error channel.")
        }

        let channel = bot.channels.get(errorChannel)

        // TODO: update all promises into async/await
        let sentErrors = []
        let retryErrors = []
        let newErrors = []

        let sendMessage = async (msg) => {
          try {
            // don't really care about the message
            await channel.send(msg)
            return true
          } catch (channelErr) {
            newErrors.push(channelErr.stack)
            return false
          }
        }

        sendMessage(`Found ${unsentErrors.length} error(s) on recovery.`)

        for (let recordErr of unsentErrors) {
          if (await sendMessage(`\`\`\`\n${recordErr}\`\`\``)) {
            sentErrors.push(recordErr)
          } else {
            retryErrors.push(recordErr)
          }
        }

        if (newErrors.length) {
          console.log(`${newErrors.length} errors occured while sending messages.`)
        }

        // only save the first few errors, since if there are more than
        // that it's probably a recurring issue.
        retryErrors.push(...newErrors.slice(0, 5))

        if (sentErrors.length) {
          db.update({ error: 'sentErrors' },
            { $push: { errors: { $each: sentErrors } } },
            { upsert: true },
            (err, numReplaced) => {
              if (err) {
                return console.log(err)
              }
              console.log(`Reported on ${numReplaced} error(s).`)
            })
        }

        db.update({ error: 'unsentErrors' },
          { $set: { errors: retryErrors } },
          err => {
            if (err) {
              return console.log(err)
            }
            if (retryErrors.length) {
              console.log(`Retrying ${retryErrors.length} error(s) later.`)
            } else {
              console.log('Cleared unsent errors.')
            }
          })
      })
  })
}

/**
 * Record the error and proceed to crash.
 *
 * @param {Error} err The error to catch.
 */
function panicResponsibly (err) {
  console.log(err)
  db.update({ error: 'unsentErrors' },
    { $push: { errors: err.stack } },
    { upsert: true },
    (err, numReplaced) => {
      if (err) {
        console.log(err)
      }
      console.log(`Recorded ${numReplaced} error(s). Now crashing.`)
      process.exit(1)
    })
}

/*
 * main
 */

process.once('uncaughtException', panicResponsibly)

bot.on('ready', () => {
  console.log('Bot ready. Setting up...')
  updateActivity()
  notifyRestart()
  notifyNewErrors()
}).on('message', message => {
  if (!message.author.bot) {
    parse(message)
  }
}).on('error', panicResponsibly)

if (!config.has('token')) {
  console.error("Couldn't find a token to connect with.")
}

bot.login(config.get('token'))
