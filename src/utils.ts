import { Channel, Message, TextChannel } from "discord.js";

import log from "npmlog";

// init log style
Object.defineProperty(log, "heading", { get: () => `[${new Date().toISOString()}]` });
log.headingStyle = { fg: "blue" };
log.levels = new Proxy(log.levels, {
  get: (o, k) => o[k] || o.info,
  has: () => true,
});
log.style = new Proxy(log.style, {
  get: (o, k) => o[k] || o.info,
});

function splitPrefix(status: string): [string, string] {
  const sepIndex = status.indexOf(":");
  if (sepIndex === -1) {
    return [status, ""];
  }
  return [status.substr(0, sepIndex), status.substr(sepIndex + 1)];
}

/**
 * Prints a formatted message with a related object.
 *
 * @param status A log level or log prefix. A log prefix that doesn't have a `prefix:status` that
 * is also a log level will default to level info. (eg `error:command/ping` vs
 * `success:command/ping`)
 * @param message Object to log after status.
 */
export function logMessage(status: string, message: string, ...args: any[]) {
  log.log(...splitPrefix(status), message, ...args);
}

/**
 * Check if channel is a TextChannel. Technically it can be a guild, dm or group dm channel, but
 * the default discord.js type for a text based channel is not actually a type, so we have to have
 * this workaround.
 */
export function isTextChannel(channel: Channel): channel is TextChannel {
  return ["dm", "group", "text"].includes(channel.type) && "send" in channel;
}

/**
 * Send a message to a channel and swallow errors.
 */
export async function sendMessage(msg: string, channel: TextChannel) {
  try {
    await channel.send(msg);
    return true;
  } catch (err) {
    logMessage("error", err);
    return false;
  }
}

/**
 * Convert a message object into a string in the form of guildname: message{0, 100}
 */
export function messageSummary({ guild, content }: Message) {
  const guildName = guild ? guild.name : "unknown guild";
  return `${guildName}: ${content.substr(0, 100)}`;
}
