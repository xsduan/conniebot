import { Channel, TextChannel } from "discord.js";

/**
 * Prints a formatted message with a related object.
 *
 * @param status Status logged as "(<status>)"
 * @param message Object to log after status
 */
export function logMessage(status: string, message?: any) {
  const log = message ? ` ${message}` : "";
  console.log(`(${status})${log}`);
}

/**
 * Check if channel is a TextChannel. Technically it can be a guild, dm or group dm channel, but
 * the default discord.js type for a text based channel is not actually a type and so must have
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
    console.log(err);
    return false;
  }
}
