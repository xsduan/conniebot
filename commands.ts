import c from "config";
import { Message } from "discord.js";

import ConniebotDatabase from "./db-management";
import help from "./help";

type Command = (message: Message, db: ConniebotDatabase, ...args: string[]) => Promise<any>;

interface ICommands {
  [key: string]: Command;
}

/**
 * Tries to respond in a timely fashion.
 * @param message Message to respond to (read time)
 */
async function ping(message: Message) {
  const elapsed = Date.now() - message.createdTimestamp;
  const elapsedMsg = `${elapsed} ms`;
  await message.channel.send(`I'm alive! (${elapsedMsg})`);
  return elapsedMsg;
}

async function setChannel(message: Message, db: ConniebotDatabase, event: string) {
  if (message.author.id !== c.get("owner")) {
    return message.reply("Sorry, but you don't have permissions to do that.");
  }

  if (!event) {
    return message.reply("Sorry, you need to specify an event.");
  }

  const channel = message.channel;
  let returnMessage: string;

  try {
    await db.setChannel(event.substr(0, 50), channel.id);
    returnMessage = `Got it! Will send notifications for ${event} to ${message.channel}.`;
  } catch (err) {
    console.log(err);
    returnMessage = "Something went wrong while trying to set notifications.";
  }

  return channel.send(returnMessage);
}

const commands = {
  help: message => help(message.channel, message.client.user),
  notif: setChannel,
  ping,
} as ICommands;

export default commands;
