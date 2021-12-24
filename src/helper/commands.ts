import { Message, MessageEmbed, MessageOptions } from "discord.js";

import { ICommands } from "../conniebot";
import { log } from "./utils";
import { formatObject } from "./utils/format";

const dmReply = async (message: Message, data: string | MessageOptions) => {
  try {
    if (message.channel.type === "DM") {
      // Already in DMs, no need to explicitly say "DM sent"
      await message.reply(data);
      return "DM sent.";
    } else {
      await message.author.send(data);
      return message.reply("DM sent.");
    }
  } catch {
    return message.reply("Unable to send DM.");
  }
};

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
    return message.reply(
      typeof data === "string" ? data : { embeds: [new MessageEmbed(data)] }
    );
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

    let returnMessage: string;

    try {
      await this.db.setChannel(event, message.channelId);
      returnMessage = `Got it! Will send notifications for ${event} to ${message.channel}.`;
    } catch (err) {
      log("error", err);
      returnMessage = "Something went wrong while trying to set notifications.";
    }

    return message.reply(returnMessage);
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
    const pingReturn = await message.reply(`I'm alive! (${elapsedMsg})`);
    const pingMsg = Array.isArray(pingReturn) ? pingReturn[0] : pingReturn;
    const roundtripMsg = `${Date.now() - created} ms`;

    if (roundtrip === "roundtrip") {
      pingMsg.edit(`${pingMsg}, roundtrip ${roundtripMsg}`);
    }

    return `${elapsedMsg}, ${roundtripMsg}`;
  },

  /**
   * Send a DM to the user containing invite information.
   */
  async invite(message) {
    const data = formatObject(
      this.config.invite,
      { user: message.client.user, config: this.config }
    );
    return dmReply(message, data);
  },

  /**
   * List the known alphabets and their help pages.
   */
  async alphabets(message) {
    if (this.alphabetList) return message.reply(this.alphabetList);
  },
};

export default commands;
