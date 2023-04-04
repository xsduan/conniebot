import {
  Client,
  EmbedBuilder,
  Message,
  version as djsVersion,
} from "discord.js";
import formatDuration from "format-duration";

import { ICommands } from "../conniebot.js";
import { defaultSettings, IServerSettings } from "./db-management.js";
import { formatObject } from "./utils/format.js";
import { isMod, log, MessageOptions, reply } from "./utils/index.js";

type ValueOf<T> = T[keyof T];

const dmReply = async (message: Message, bot: Client, data: string | MessageOptions) => {
  let retval: Message;
  try {
    if (message.channel.isDMBased()) {
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
  } else if (key === "reactRemovalTimeout") {
    const num = Number(value);
    // It's official, TypeScript is dumb. It won't compile *without* this cast.
    if (Object.is(num, -0)) return 0 as IServerSettings[T];
    if (Number.isFinite(num) && num >= 0) return num as IServerSettings[T];
  }
  return undefined;
};

const settingsDescriptions: Readonly<Record<keyof IServerSettings, string>> = {
  server: "Server ID. This cannot be changed.",
  dmHelp: "When to send help messages in DMs rather than the original channel.\n\n`0`: Never.\n" +
    "`1`: In voice channel chat only.\n`2`: In threads only (including forum posts).\n`3`: In " +
    "voice channel chat or threads.\n`4`: In all channels.",
  reactRemovalTimeout: "How long to wait before removing the wastebasket reaction from a message," +
    " in minutes. Enter `0` to disable reaction removal.",
};

const settingsOrder: Readonly<Record<keyof IServerSettings, number>> = {
  server: 0,
  dmHelp: 1,
  reactRemovalTimeout: 2,
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
        message.channel.isVoiceBased() && Boolean(dmHelpSetting & 1) ||
        message.channel.isThread() && Boolean(dmHelpSetting & 2);
    }
    const replyFunc = shouldDM ? dmReply : reply;

    const response = await replyFunc(
      message,
      this.bot,
      typeof data === "string" ? data : { embeds: [new EmbedBuilder(data)] },
    );

    if (response) {
      await Promise.all([
        this.addDeleteReaction(response),
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
  invite(message) {
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
          message.channel.isVoiceBased() && Boolean(dmHelpSetting & 1) ||
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

      const { guildId } = message;
      return await this.addConfirmation(
        async confirmation => {
          await this.db.deleteServerSettings(guildId);
          return reply(confirmation, this.bot, "Server settings reset to defaults.");
        },
        message,
        "config reset",
        "Are you sure you want to reset all settings to defaults? Reply y/n to confirm/cancel. " +
          "Otherwise, this will automatically cancel " +
          `<t:${Math.ceil(Date.now() / 1000 + this.config.confirmationTimeout)}:R>.`,
        false,
      ) ?? "Awaiting reset confirmation";
    }

    if (!settingsDescriptions.hasOwnProperty(key)) {
      return sendReply("Sorry, I don't recognize that option.");
    }

    if (!option) {
      const settings = await this.db.getSettings(message.guildId);
      const text = settingsDescriptions[key as keyof IServerSettings] + (
        defaultSettings.hasOwnProperty(key)
          ? `\nDefault: \`${defaultSettings[key as keyof typeof defaultSettings]}\``
          : ""
      ) + `\nCurrent setting: \`${settings[key as keyof IServerSettings]}\``;
      return sendReply(text);
    }

    const coercedOption = coerceSetting(key as keyof IServerSettings, option);
    if (coercedOption === undefined) {
      return sendReply("Sorry, that's not a valid setting.");
    }

    await this.db.updateSettings(message.guildId, { [key]: coercedOption });
    return sendReply(`${key} setting is now \`${coercedOption}\`.`);
  },

  async purge(message) {
    return await this.addConfirmation(
      async confirmation => {
        const result = await this.db.purgeUser(message.author.id);
        void reply(confirmation, this.bot, "You have been deleted from our records.");
        return `Removed ${result.changes} rows for user ${message.author.id}.`;
      },
      message,
      "purge",
      "Are you sure you want to permanently delete yourself from the records?\nThis will prevent " +
        "the bot from editing or self-deleting responses to messages you sent, but does not " +
        "prevent future records from being added. For more details, see the privacy policy at " +
        `<${this.config.privacyURL}>.\nReply with "y" to confirm or "n" to cancel. Otherwise, ` +
        "this will automatically cancel " +
        `<t:${Math.ceil(Date.now() / 1000 + this.config.confirmationTimeout)}:R>.`,
      true,
    ) ?? "Awaiting purge confirmation";
  },

  about(message) {
    return reply(
      message,
      this.bot,
      `__Bot Info__
Server count: ${this.bot.guilds.cache.size}
Version: ${process.env.npm_package_version}
Uptime: ${formatDuration(this.bot.uptime ?? 0, { leading: true })}
NodeJS: ${process.versions.node}
discord.js: ${djsVersion}

For information about commands, type "${this.config.prefix}help". For information about text \
replacement, type "${this.config.prefix}alpha".`
    );
  },
};

export default commands;
