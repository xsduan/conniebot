import c from "config";
import { Client, Message, RichEmbed } from "discord.js";
import process from "process";
import OuterXRegExp from "xregexp";

import commands from "./commands";
import ConniebotDatabase from "./db-management";
import embed from "./embed";
import startup from "./startup";
import { logMessage } from "./utils";
import x2i from "./x2i";

const bot = new Client();
const db = new ConniebotDatabase();

/**
 * Convert a message object into a string in the form of guildname: message{0, 100}
 */
function messageSummary({ guild, content }: Message) {
  const guildName = guild ? guild.name : "unknown guild";
  return `${guildName}: ${content.substr(0, 100)}`;
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
  if (!toks) return;

  const [, cmd, args] = toks;
  const cb = commands[cmd];
  if (!cb) return;

  try {
    const log = await cb(message, db, ...args.split(" "));
    logMessage(`success:command/${cmd}`, log);
  } catch (err) {
    // TODO: error reporting
    logMessage(`error:command/${cmd}`, err);
  }
}

/**
 * Sends an x2i string (but also could be used for simple embeds)
 *
 * @param message Message to reply to
 */
async function x2iExec(message: Message) {
  let results = x2i(message.content);
  const parsed = Boolean(results && results.length !== 0);
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
      logMessage("success:x2i");
    } catch (err) {
      logMessage("error:x2i", err);
    }
  }

  return parsed;
}

/**
 * Acts for a response to a message.
 *
 * @param message Message to parse for responses
 */
async function parse(message: Message) {
  if (message.author.bot) return;
  if (await x2iExec(message)) return;
  await command(message);
}

/**
 * Record the error and proceed to crash.
 *
 * @param err The error to catch.
 * @param exit Should exit? (eg ECONNRESET would not require reset)
 */
async function panicResponsibly(err: any, exit = true) {
  console.log(err);
  await db.addError(err);
  if (exit) {
    process.exit(1);
  }
}

process.once("uncaughtException", panicResponsibly);

if (!c.has("token")) {
  throw new Error("Couldn't find a token to connect with.");
}

bot.on("ready", () => startup(bot, db))
  .on("message", parse)
  .on("error", err => {
    if (err && err.message && err.message.includes("ECONNRESET")) {
      return console.log("connection reset. oops!");
    }
    panicResponsibly(err);
  })
  .login(c.get("token"));
