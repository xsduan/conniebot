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
 *
 * @param message Message to respond to (read time)
 * @param roundtrip Should the heartbeat be sent to the message ("roundtrip")
 */
async function ping(message: Message, _: any, roundtrip?: string) {
  // received message
  const created = message.createdTimestamp;
  const elapsedMsg = `${Date.now() - created} ms`;

  // wait for send
  const pingReturn = await message.channel.send(`I'm alive! (${elapsedMsg})`);
  const pingMsg = Array.isArray(pingReturn) ? pingReturn[0] : pingReturn;
  const roundtripMsg = `${Date.now() - created} ms`;

  if (roundtrip === "roundtrip") {
    pingMsg.edit(`${pingMsg}, roundtrip ${roundtripMsg}`);
  }

  return `${elapsedMsg}, ${roundtripMsg}`;
}

/**
 * Set channel for an arbitrary event (currently only uses `restart` and `events`)
 *
 * @param db Database instance.
 * @param event The event name (only the first 50 characters are used)
 */
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
