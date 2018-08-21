import { Channel, TextChannel } from "discord.js";

/**
 * Prints a formatted message with a related object.
 * @param status Status logged as "(<status>)"
 * @param message Object to log after status
 */
export function logMessage(status: string, message?: any) {
  const log = message ? ` ${message}` : "";
  console.log(`(${status})${log}`);
}

export function isTextChannel(channel: Channel): channel is TextChannel {
  return ["dm", "group", "text"].includes(channel.type) && "send" in channel;
}

export async function sendMessage(msg: string, channel: TextChannel) {
  try {
    await channel.send(msg);
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
}
