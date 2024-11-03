import {
  ChannelType,
  Client,
  Message,
  MessageCreateOptions,
  MessageReplyOptions,
  PermissionFlagsBits,
  SendableChannels,
} from "discord.js";
import c from "config";

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
 * Send a message to a channel and swallow errors.
 */
export async function sendMessage(msg: string, channel: SendableChannels) {
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
  return `${guildName}: ${content.substring(0, 100).trimEnd()}`;
}

export type MessageOptions = MessageCreateOptions & MessageReplyOptions;

export type ReplyFn = (
  message: Message,
  bot: Client,
  data: string | MessageOptions
) => Promise<Message | undefined>;

/**
 * Reply to a message, using Message#reply if allowed, or Channel#send otherwise.
 * @param message The message to reply to
 * @param bot The user to reply as
 * @param data The data to send
 * @returns The message sent, if it could be sent.
 */
export const reply: ReplyFn = async (message, bot, data) => {
  try {
    if (
      // @ts-expect-error The thing it complains about is why the `?.` is there
      message.channel.permissionsFor?.(bot.user)?.has(PermissionFlagsBits.ReadMessageHistory)
        ?? true
    ) {
      return await message.reply(data);
    } else if (message.channel.isSendable()) {
      return await message.channel.send(data);
    } else {
      log("error", "Cannot send message in channel of type ", ChannelType[message.channel.type]);
    }
  } catch (err) {
    log("error", err);
  }
};

/**
 * Determine whether someone is a mod who can update server settings
 */
export const isMod = (message: Message) => {
  const member = message.guild?.members.resolve(message.author);
  const hasPerms = member?.permissions.has(
    PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageMessages
  );
  return hasPerms ?? false;
};
