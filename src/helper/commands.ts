import { Client, DiscordAPIError, Message, MessageEmbed, MessageOptions } from "discord.js";

import { ICommands } from "../conniebot.js";
import { IServerSettings } from "./db-management.js";
import { formatObject } from "./utils/format.js";
import { isMod, log, reply } from "./utils/index.js";

type ValueOf<T> = T[keyof T];

const dmReply = async (message: Message, bot: Client, data: string | MessageOptions) => {
  let retval: Message;
  try {
    if (message.channel.type === "DM") {
      // Already in DMs, no need to explicitly say "DM sent"
      return await message.reply(data);
    }

    retval = await message.author.send(data);
  } catch {
    return reply(message, bot, "Unable to send DM.");
  }
  await reply(message, bot, "DM sent.");
  return retval;
};

const coerceSetting = <T extends keyof IServerSettings>(
  key: T,
  value: string
): IServerSettings[T] | undefined => {
  if (key === "dmHelp") {
    const num = Number(value);
    if ([0, 1, 2, 3, 4].includes(num)) return num as IServerSettings[T];
  }
  return undefined;
};

const settingsDescriptions: Readonly<Record<keyof IServerSettings, string>> = {
  server: "Server ID. This cannot be changed.",
  dmHelp: "When to send help messages in DMs rather than the original channel.\n\n`0` (default): " +
    "Never.\n`1`: In voice channel chat only.\n`2`: In threads only.\n`3`: In voice channel chat " +
    "or threads.\n`4`: In all channels.",
};

const settingsOrder: Readonly<Record<keyof IServerSettings, number>> = {
  server: 0,
  dmHelp: 1,
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

    let shouldDM = false;
    if (message.guildId) {
      const dmHelpSetting = (await this.db.getSettings(message.guildId)).dmHelp;
      shouldDM = dmHelpSetting === 4 ||
        message.channel.isVoice() && Boolean(dmHelpSetting & 1) ||
        message.channel.isThread() && Boolean(dmHelpSetting & 2);
    }
    const replyFunc = shouldDM ? dmReply : reply;

    const response = await replyFunc(
      message,
      this.bot,
      typeof data === "string" ? data : { embeds: [new MessageEmbed(data)] },
    );

    if (response) {
      await Promise.all([
        this.reactIfAllowed(response, this.config.deleteEmoji),
        this.db.addMessage(message, [response], false),
      ]);
    }

    return response;
  },

  /**
   * Set channel for an arbitrary event. (see {@link INotifRow})
   *
   * @param event The event name (only the first 50 characters are used)
   */
  async notif(message, event) {
    if (message.author.id !== this.config.owner) {
      return reply(message, this.bot, "Sorry, but you don't have permissions to do that.");
    }

    if (!event) {
      return reply(message, this.bot, "Sorry, you need to specify an event.");
    }

    let returnMessage: string;

    try {
      await this.db.setChannel(event, message.channelId);
      returnMessage = `Got it! Will send notifications for ${event} to ${message.channel}.`;
    } catch (err) {
      log("error", err);
      returnMessage = "Something went wrong while trying to set notifications.";
    }

    return reply(message, this.bot, returnMessage);
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
    const pingReturn = await reply(message, this.bot, `I'm alive! (${elapsedMsg})`);
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
    return dmReply(message, this.bot, data);
  },

  /**
   * List the known alphabets and their help pages.
   */
  async alpha(message) {
    if (this.alphabetList) {
      let shouldDM = false;
      if (message.guildId) {
        const dmHelpSetting = (await this.db.getSettings(message.guildId)).dmHelp;
        shouldDM = dmHelpSetting === 4 ||
          message.channel.isVoice() && Boolean(dmHelpSetting & 1) ||
          message.channel.isThread() && Boolean(dmHelpSetting & 2);
      }
      const replyFunc = shouldDM ? dmReply : reply;

      return replyFunc(message, this.bot, this.alphabetList);
    }
  },

  /**
   * Update server-wide config settings.
   */
  async config(message, key?, option?) {
    const sendReply = reply.bind(undefined, message, this.bot);

    if (!message.guildId) {
      return sendReply("Sorry, that command is only available in servers.");
    }

    if (!isMod(message)) {
      return sendReply("Sorry, but you don't have permissions to do that.");
    }

    if (!key) {
      const settings = await this.db.getSettings(message.guildId);
      const text = (Object.entries(settings) as [keyof IServerSettings, ValueOf<IServerSettings>][])
        .sort((a, b) => settingsOrder[a[0]] - settingsOrder[b[0]])
        .map(([opt, val]) => `${opt} - \`${val}\``)
        .join("\n");
      return sendReply(text);
    }

    if (key === "reset") {
      if (option) return sendReply("Cannot use reset with other options.");

      // See if someone recently tried in this channel. If it's the same person, treat it as a
      // confirmation. Otherwise, display an error message.
      const existingConfirmationIndex = this.pendingConfirmations.findIndex(el =>
        el.channel === message.channelId);
      if (existingConfirmationIndex !== -1) {
        const info = this.pendingConfirmations[existingConfirmationIndex];
        if (message.author.id === info.author) {
          clearTimeout(info.timeout);
          this.pendingConfirmations.splice(existingConfirmationIndex, 1);

          await this.db.deleteServerSettings(message.guildId);
          return sendReply("Server settings reset to defaults.");
        } else {
          return sendReply("There's already a pending reset in this channel!");
        }
      }

      const response = await sendReply("Are you sure you want to reset all settings to defaults?" +
        " Reply y/n to confirm/cancel. Otherwise, this will automatically cancel" +
        ` <t:${Math.ceil(Date.now() / 1000) + this.config.confirmationTimeout}:R>.`);
      if (!response) return;

      // add a confirmation
      const timeout = setTimeout(async () => {
        try {
          await response.edit("Cancelled automatically due to timeout.");
          log("info:command/config", "Confirmation timed out");
        } catch (err) {
          if (err instanceof DiscordAPIError && err.code === 10008) return;
          log(
            "error:command/config",
            `${message.guild?.name ?? "unknown guild"}: Unable to edit message '${message}': ${err}`
          );
        } finally {
          const index = this.pendingConfirmations.findIndex(el => el.timeout === timeout);
          if (index !== -1) this.pendingConfirmations.splice(index, 1);
        }
      }, this.config.confirmationTimeout * 1000);

      this.pendingConfirmations.push({
        timeout,
        author: message.author.id,
        channel: message.channelId,
      });

      return "Awaiting reset confirmation";
    }

    if (!settingsDescriptions.hasOwnProperty(key)) {
      return sendReply("Sorry, I don't recognize that option.");
    }

    if (!option) {
      const settings = await this.db.getSettings(message.guildId);
      const text = settingsDescriptions[key as keyof IServerSettings] +
        `\n\nCurrent setting: \`${settings[key as keyof IServerSettings]}\``;
      return sendReply(text);
    }

    const coercedOption = coerceSetting(key as keyof IServerSettings, option);
    if (coercedOption === undefined) {
      return sendReply("Sorry, that's not a valid setting.");
    }

    await this.db.updateSettings(message.guildId, { [key]: coercedOption });
    return sendReply(`${key} setting is now \`${coercedOption}\`.`);
  },

  async purge(message, user?) {
    const sendReply = reply.bind(undefined, message, this.bot);

    if (!user) {
      return sendReply("Are you sure you want to permanently delete yourself from the records?" +
        "\nThis will prevent the bot from editing or self-deleting responses to messages you " +
        "sent, but does not prevent future records from being added.\nIf you want to continue, " +
        `type "x/purge [TODO: FIGURE OUT WHAT HERE]".`);
    }
  },
};

export default commands;
