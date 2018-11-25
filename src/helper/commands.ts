import c from "config";

import { ICommands } from "../conniebot";
import help from "../help";
import { log } from "./utils";

/**
 * Extension methods for different reply commands.
 *
 * All functions are bound to the instance of the currently running Conniebot.
 */
const commands: ICommands = {
  /**
   * Funnels a message object to the actual {@link help} function.
   */
  async help(message) {
    help(message.channel, message.client.user);
  },

  /**
   * Set channel for an arbitrary event. (see {@link INotifRow})
   *
   * @param event The event name (only the first 50 characters are used)
   */
  async notif(message, event) {
    if (message.author.id !== c.get("owner")) {
      return message.reply("Sorry, but you don't have permissions to do that.");
    }

    if (!event) {
      return message.reply("Sorry, you need to specify an event.");
    }

    const channel = message.channel;
    let returnMessage: string;

    try {
      await this.db.setChannel(event, channel.id);
      returnMessage = `Got it! Will send notifications for ${event} to ${message.channel}.`;
    } catch (err) {
      log("error", err);
      returnMessage = "Something went wrong while trying to set notifications.";
    }

    return channel.send(returnMessage);
  },

  /**
   * Tries to respond in a timely fashion.
   *
   * @param roundtrip Should the heartbeat be sent to the message ("roundtrip")
   */
  async ping(message, roundtrip?) {
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
