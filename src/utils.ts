import { Channel, Message, TextChannel } from "discord.js";

import colors from "colors";
import c from "config";

let logTheme: { [k: string]: string } = {};

if (c.has("logColors")) {
  logTheme = c.get("logColors");
  colors.setTheme(logTheme);
}

function colorLog(msg: string, level: string): string | void {
  if (logTheme.hasOwnProperty(level)) {
    return (msg as any)[level];
  }
}

function colorType(status: string) {
  for (const k of Object.keys(logTheme)) {
    if (status.search(`${k}:`) === 0) {
      return k;
    }
  }
  return "info";
}

/**
 * Prints a formatted message with a related object.
 *
 * @param level Similar to log level in a proper system, but only affects color.
 * @param message Object to log after status
 */
export function logMessage(level: string, ...message: any[]) {
  const ts = `[${(new Date()).toISOString()}]`;

  console.log(
    colorLog(ts, "debug") || ts.blue,
    colorLog(level, level) || colorLog(level, colorType(level)) || level.green,
    ...message,
  );
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
