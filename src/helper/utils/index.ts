import c from "config";
import { Channel, Message, TextChannel } from "discord.js";

import npmlog from "npmlog";

// init log style
Object.defineProperty(npmlog, "heading", {
  get: () => `[${new Date().toISOString()}]`,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  set: () => { }, // ignore sets since we just need it to be a timestamp
});
npmlog.headingStyle = { fg: "blue" };
npmlog.levels = new Proxy(npmlog.levels, { get: (o, k) => o[k] || o.info, has: () => true });
npmlog.style = new Proxy(npmlog.style, { get: (o, k) => o[k] || o.info });
npmlog.enableColor();
npmlog.level = c.has("level") ? c.get("level") : "info";

function splitPrefix(status: string): [string, string] {
  const sepIndex = status.indexOf(":");
  if (sepIndex === -1) {
    return [status, ""];
  }
  return [status.substring(0, sepIndex), status.substring(sepIndex + 1)];
}

/**
 * Prints a formatted message with a related object.
 *
 * @param status A log level or log prefix. A log prefix that doesn't have a `prefix:status` that
 * is also a log level will default to level info. (eg `error:command/ping` vs
 * `success:command/ping`)
 * @param message Object to log after status.
 */
export function log(status: string, message: string, ...args: any[]) {
  npmlog.log(...splitPrefix(status), message, ...args);
}

/**
 * Check if channel is a TextChannel. Technically it can be a guild, dm or group dm channel, but
 * the default discord.js type for a text based channel is not actually a type, so we have to have
 * this workaround.
 */
export function isTextChannel(channel: Channel): channel is TextChannel {
  return ["DM", "GROUP_DM", "GUILD_TEXT", "GUILD_PUBLIC_THREAD"].includes(channel.type)
    && "send" in channel;
}

/**
 * Send a message to a channel and swallow errors.
 */
export async function sendMessage(msg: string, channel: TextChannel) {
  try {
    await channel.send(msg);
    return true;
  } catch (err) {
    log("error", err);
    return false;
  }
}

/**
 * Convert a message object into a string in the form of guildname: message{0, 100}
 */
export function messageSummary({ guild, content }: Message) {
  const guildName = guild ? guild.name : "unknown guild";
  return `${guildName}: ${content.substring(0, 100)}`;
}
