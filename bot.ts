import c from "config";
import { Client, Message, RichEmbed, TextChannel } from "discord.js";
import Nedb from "nedb";
import process from "process";
import OuterXRegExp from "xregexp";

import embed from "./embed";
import help from "./help";
import { isTextChannel } from "./utils";
import x2i from "./x2i";

interface ICommands {
  [key: string]: (message: Message, ...args: string[]) => Promise<string | void>;
}

interface INotificationChannels {
  [key: string]: string;
}

// lifetime objects
const bot = new Client();
const db = new Nedb({ filename: c.get("database"), autoload: true });
const commands: ICommands = {
  help: message => help(message.channel, bot.user),
  notif: setChannel,
  ping, // ping command is special case response.
};

/*
 * functions
 */

/**
 * Prints a formatted message with a related object.
 * @param status Status logged as "(<status>)"
 * @param message Object to log after status
 */
function logMessage(status: string, message?: any) {
  const log = message ? ` ${message}` : "";
  console.log(`(${status})${log}`);
}

/**
 * Convert a message object into a string in the form of guildname: message{0, 100}
 */
function messageSummary({ guild, content }: Message) {
  const guildName = guild ? guild.name : "unknown guild";
  return `${guildName}: ${content.substr(0, 100)}`;
}

/**
 * Acts for a response to a message.
 *
 * @param message Message to parse for responses
 */
async function parse(message: Message) {
  if (await x2iExec(message)) {
    return logMessage("success:x2i")
  }
  await command(message);
}

/**
 * Looks for a reply message.
 *
 * @param message Received message.
 */
async function command(message: Message) {
  // commands
  const prefixRegex = OuterXRegExp.build(
    `(?:^${OuterXRegExp.escape(c.get("prefix"))})(\\S*) ?(.*)`, [],
  );

  const toks = message.content.match(prefixRegex);
  if (!toks) {
    return false;
  }

  const [, cmd, args] = toks;
  const cb = commands[cmd];
  if (cb) {
    try {
      const log = await cb(message, ...args.split(" "));
      logMessage(`success:command/${cmd}`, log);
    } catch (err) {
      // TODO: error reporting
      logMessage(`error:command/${cmd}`, err);
    }
  }

  logMessage("processed:command/" + cmd, messageSummary(message));
  return true;
}

/**
 * Tries to respond in a timely fashion.
 * @param message Message to respond to (read time)
 */
async function ping(message: Message) {
  const elapsed = new Date().getTime() - message.createdTimestamp;
  const elapsedMsg = `${elapsed} ms`;
  await message.channel.send(`I'm alive! (${elapsedMsg})`);
  return elapsedMsg;
}

/**
 * Sends an x2i string (but also could be used for simple embeds)
 * @param message Message to reply to
 */
async function x2iExec(message: Message) {
  let results = x2i(message.content);
  let parsed = results && results.length !== 0;
  if (parsed) {
    const response = new RichEmbed().setColor(
      c.get("embeds.colors.success"),
    );
    let logCode = "all";

    // check timeout
    const charMax = parseInt(c.get("embeds.timeoutChars"), 10);
    if (results.length > charMax) {
      results = `${results.slice(0, charMax - 1)}…`;

      response
        .addField("Timeout", c.get("embeds.timeoutMessage"))
        .setColor(c.get("embeds.colors.warning"));

      logCode = "partial";
    }

    response.setDescription(results);
    logMessage(`processed:x2i/${logCode}`, messageSummary(message));

    try {
      await embed(message.channel, response);
      logMessage("success:x2i")
    } catch (err) {
      logMessage("error:x2i", err)
    }
  }

  return parsed
}

/**
 * Sets a event notification channel.
 *
 * @param message Command message.
 * @param event Event to register.
 */
async function setChannel(message: Message, event: string) {
  if (message.author.id === c.get("owner")) {
    if (!event) {
      await message.channel.send("Sorry, you need to specify an event.");
      return;
    }

    console.log(message.channel.id);
    db.update(
      { config: c.get("owner") },
      { $set: { [`notifs.${event}`]: message.channel.id } },
      { upsert: true },
      (err, numReplaced) => {
        if (err) {
          message.channel.send(
            "Something went wrong while trying to set notifications.",
          );
          return console.log(err);
        }
        console.log(`Updated ${numReplaced} for ${event} notification.`);
      },
    );
    await message.channel.send(
      `Got it! Will send notifications for ${event} to ${message.channel}.`,
    );
    return;
  }
  await message.reply("Sorry, but you don't have permissions to do that.");
}

/**
 * Update activity of bot.
 */
async function updateActivity() {
  if (c.has("activeMessage")) {
    console.log("Changing game status...");
    try {
      await bot.user.setActivity(c.get("activeMessage"));
      console.log("Set game status.");
    } catch (err) {
      console.log(`Status couldn't be set. ${err}`);
    }
  }
}

/**
 * Send notification to channel for reboot.
 */
async function notifyRestart() {
  if (c.has("owner")) {
    db.findOne(
      { config: c.get("owner") },
      async (err, docs: any = []) => {
        if (err) {
          return console.log(err);
        }

        if (!docs || !docs.notifs) {
          console.log(docs)
          return console.log("Couldn't find channel to notify.");
        }

        let restart = docs.notifs.restart
        const channel = bot.channels.get(restart);
        if (!channel) {
          return console.log(`Channel ${restart} doesn't exist.`);
        }

        if (!isTextChannel(channel)) {
          return console.log(`Channel ${restart} isn't a text channel.`);
        }

        try {
          await (channel as any).send(`Rebooted at ${new Date()}.`);
          console.log(
            `Notified ${channel} (#${channel.name || "??"}) of restart.`);
        } catch (err) {
          console.log(err);
        }
      },
    );
  } else {
    console.log("Owner key doesn't exist.");
  }
}

function notifyNewErrors() {
  // TODO: use best practices, don't c+p code
  db.find({ error: "unsentErrors" }, (err: Error, [docs]: { errors: string[] }[] = []) => {
    if (err) {
      return console.log(err);
    }

    let unsentErrors: string[];
    if (docs && docs.errors.length) {
      unsentErrors = docs.errors;
    } else {
      unsentErrors = [];
    }

    if (!unsentErrors.length) {
      return;
    }

    // oh good, callback hell
    db.findOne(
      { config: c.get("owner") },
      { "notifs.errors": 1, "_id": 0 },
      async (ownerErr, docs: any) => {
        if (ownerErr) {
          return console.log(ownerErr);
        }

        if (!docs || !docs.notifs || !docs.notifs.errors) {
          return console.log("Couldn't find error channel.");
        }

        const channel: any = bot.channels.get(docs.notifs.errors);

        // TODO: update all promises into async/await
        const sentErrors: any = [];
        const retryErrors: any = [];
        const newErrors: any = [];

        const sendMessage = async (msg: any) => {
          try {
            // don't really care about the message
            await channel.send(msg);
            return true;
          } catch (channelErr) {
            newErrors.push(channelErr.stack);
            return false;
          }
        };

        sendMessage(`Found ${unsentErrors.length} error(s) on recovery.`);

        for (const recordErr of unsentErrors) {
          if (await sendMessage(`\`\`\`\n${recordErr}\`\`\``)) {
            sentErrors.push(recordErr);
          } else {
            retryErrors.push(recordErr);
          }
        }

        if (newErrors.length) {
          console.log(
            `${newErrors.length} errors occured while sending messages.`,
          );
        }

        // only save the first few errors, since if there are more than
        // that it's probably a recurring issue.
        retryErrors.push(...newErrors.slice(0, 5));

        if (sentErrors.length) {
          db.update(
            { error: "sentErrors" },
            { $push: { errors: { $each: sentErrors } } },
            { upsert: true },
            sentErrorsUpdateErr => {
              if (sentErrorsUpdateErr) {
                return console.log(sentErrorsUpdateErr);
              }
              console.log(`Reported on ${sentErrors.length} error(s).`);
            },
          );
        }

        db.update(
          { error: "unsentErrors" },
          { $set: { errors: retryErrors } },
          ((unsentErrorsUpdateErr: any) => {
            if (unsentErrorsUpdateErr) {
              return console.log(unsentErrorsUpdateErr);
            }
            if (retryErrors.length) {
              console.log(`Retrying ${retryErrors.length} error(s) later.`);
            } else {
              console.log("Cleared unsent errors.");
            }
          }) as any,
        );
      },
    );
  });
}

/**
 * Record the error and proceed to crash.
 *
 * @param err The error to catch.
 */
function panicResponsibly(err: Error) {
  console.log(err);
  db.update(
    { error: "unsentErrors" },
    { $push: { errors: err.stack } },
    { upsert: true },
    (updateErrorErr, numReplaced) => {
      if (updateErrorErr) {
        console.log(updateErrorErr);
      }
      console.log(`Recorded ${numReplaced} error(s). Now crashing.`);
      process.exit(1);
    },
  );
}

/*
 * main
 */

process.once("uncaughtException", panicResponsibly);

bot
  .on("ready", () => {
    console.log("Bot ready. Setting up...");
    updateActivity();
    notifyRestart();
    notifyNewErrors();
  })
  .on("message", message => {
    if (!message.author.bot) {
      parse(message);
    }
  })
  .on("error", panicResponsibly);

if (!c.has("token")) {
  console.error("Couldn't find a token to connect with.");
}

bot.login(c.get("token"));
