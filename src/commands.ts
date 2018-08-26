import c from "config";
import { Message } from "discord.js";

import { ICommands } from ".";
import help from "./help";

/**
 * Extension methods for different reply commands.
 *
 * All functions are bound to the instance of the currently running Conniebot.
 */
const commands: ICommands = {
  /**
   * Funnels a message object to the actual {@link help} function.
   */
  async help({ channel, client }) {
    help(channel, client.user);
  },

  /**
   * Set channel for an arbitrary event
   *
   * Currently used events:
   * - `restart`: Notify restart.
   * - `errors`: Notify errors. (may want to keep stack traces secret, etc)
   *
   * @param event The event name (only the first 50 characters are used)
   */
  async notif(message: Message, event: string) {
    if (message.author.id !== c.get("owner")) {
      return message.reply("Sorry, but you don't have permissions to do that.");
    }

    if (!event) {
      return message.reply("Sorry, you need to specify an event.");
    }

    const channel = message.channel;
    let returnMessage: string;

    try {
      await this.db.setChannel(event.substr(0, 50), channel.id);
      returnMessage = `Got it! Will send notifications for ${event} to ${message.channel}.`;
    } catch (err) {
      console.log(err);
      returnMessage = "Something went wrong while trying to set notifications.";
    }

    return channel.send(returnMessage);
  },

  /**
   * Tries to respond in a timely fashion.
   *
   * @param roundtrip Should the heartbeat be sent to the message ("roundtrip")
   */
  async ping(message: Message, roundtrip?: string) {
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
  },
};

export default commands;
