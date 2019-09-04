import { RichEmbed } from "discord.js";

import { ICommands } from "../conniebot";
import { log } from "./utils";
import { formatObject } from "./utils/format";

/**
 * Extension methods for different reply commands.
 *
 * All functions are bound to the instance of the currently running Conniebot.
 */
const commands: ICommands = {
  /**
   * Sends a help message, formatted with the client `user` and bot config `config`.
   */
  async help(message) {
    const data = formatObject(this.config.help, { user: message.client.user, config: this.config });
    return message.channel.send(typeof data === "string" ? data : new RichEmbed(data));
  },

  /**
   * Set channel for an arbitrary event. (see {@link INotifRow})
   *
   * @param event The event name (only the first 50 characters are used)
   */
  async notif(message, event) {
    if (message.author.id !== this.config.owner) {
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
