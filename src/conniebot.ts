import { readdir, readFile } from "fs/promises";
import * as path from "path";

import {
  Client,
  ClientOptions,
  DiscordAPIError,
  EmbedBuilder,
  EmbedData,
  Message,
  MessageReaction,
  PartialMessage,
  PartialMessageReaction,
  PartialUser,
  PermissionFlagsBits,
  User,
} from "discord.js";

import c from "config";
import * as yaml from "js-yaml";
import fetch from "node-fetch";
import XRegExp from "xregexp";

import ConniebotDatabase, { IServerSettings } from "./helper/db-management.js";
import { notifyNewErrors, notifyRestart, updateActivity } from "./helper/startup.js";
import { formatObject, strFormat } from "./helper/utils/format.js";
import { log, MessageOptions, messageSummary, reply } from "./helper/utils/index.js";
import X2IMatcher, { IReplaceSource } from "./x2i/index.js";

export type CommandCallback =
  (this: Conniebot, message: Message, ...args: string[]) => Promise<any>;

export interface IConniebotConfig {
  readonly activeMessage?: string;
  readonly botlistToken?: string;
  readonly botlistUrl?: string;
  readonly clientOptions: Readonly<ClientOptions>;
  readonly confirmationTimeout: number;
  readonly database: string;
  readonly deleteEmoji: string;
  readonly help: Readonly<EmbedData> | string;
  readonly migrations: string;
  readonly owner: string;
  readonly pingEmoji?: string;
  readonly prefix: string;
  readonly privacyURL: string;
  readonly timeoutChars: number;
  readonly timeoutMessage: Readonly<EmbedData> | string;
  readonly token: string;
  readonly x2iFiles: string;
  readonly invite: Readonly<EmbedData> | string;
}

export interface ICommands {
  [key: string]: CommandCallback;
}

interface IPendingConfirmation {
  author: string;
  allowOthers: boolean;
  channel: string;
  command: string;
  onConfirm(confirmation: Message): unknown;
  timeout: NodeJS.Timeout;
}

// the length of one day, in ms
const oneDay = 1000 * 60 * 60 * 24;

export default class Conniebot {
  public bot: Client;
  public db: ConniebotDatabase;
  public alphabetList?: string;
  public readonly config: IConniebotConfig;
  public readonly pendingConfirmations: IPendingConfirmation[];

  private commands: ICommands;
  private x2i?: X2IMatcher;

  constructor(config: IConniebotConfig) {
    log("verbose", "Starting to load bot...");

    this.config = config;

    this.bot = new Client(c.util.cloneDeep(config.clientOptions, 5));
    this.db = new ConniebotDatabase(this.config.database, this.config.migrations);
    this.commands = {};
    this.pendingConfirmations = [];

    void this.bot
      .once("ready", () => this.startup())
      .on("error", err => {
        if (err?.message?.includes("ECONNRESET")) {
          return log("warn", "connection reset. oops!");
        }
        return this.panicResponsibly(err);
      })
      .login(this.config.token);

    process.once("uncaughtException", this.panicResponsibly);
  }

  private async startup() {
    log("info", "Bot ready. Setting up...");

    if (this.config.activeMessage) {
      updateActivity(this.bot, this.config.activeMessage);
      // The status seems to disappear after 2-3 days if I don't keep calling that function
      setInterval(
        () => updateActivity(this.bot, this.config.activeMessage),
        oneDay * 2
      );
    }

    await Promise.all([
      (async () => {
        await notifyRestart(this.bot, this.db);
        await notifyNewErrors(this.bot, this.db);
      })(),
      (async () => {
        // fetch the server list and post the count to bots.gg
        await this.bot.guilds.fetch();
        await this.serverCountChanged();
      })(),
      (async () => {
        this.x2i = await this.loadKeys();
        this.alphabetList = this.x2i.alphabetList;
      })(),
    ]);

    log("info", "Setup complete.");

    // add event handlers
    this.bot
      .on("messageCreate", message => this.parse(message))
      .on("messageReactionAdd", (message, user) => this.reactDeleteMessage(message, user))
      .on("messageUpdate", (oldMsg, newMsg) => this.updateReply(oldMsg, newMsg))
      .on("guildCreate", () => this.serverCountChanged())
      .on("guildDelete", async guild => {
        await Promise.all([
          this.serverCountChanged(),
          this.db.deleteServerSettings(guild.id),
        ]);
      });
  }

  /**
   * Load keys from files in the x2i data folder.
   */
  private async loadKeys() {
    log("info", "Loading X2I keys from: \x1b[96m%s\x1b[0m...", this.config.x2iFiles);

    const x2iDir = this.config.x2iFiles;
    const x2iFiles = await readdir(x2iDir);
    const x2iData = await Promise.all(x2iFiles.map(
      fname => readFile(path.resolve(x2iDir, fname), "utf8"),
    ));

    log("info", "X2I keys have been loaded.");
    return new X2IMatcher(x2iData.map(d => yaml.load(d) as IReplaceSource));
  }

  /**
   * Record the error and proceed to crash.
   *
   * @param err The error to catch.
   * @param exit Should exit? (eg ECONNRESET would not require reset)
   */
  private panicResponsibly = async (err: any, exit = true) => {
    log("error", err);
    await this.db.addError(err);
    if (exit) {
      process.exit(1);
    }
  };

  /**
   * Looks for a reply message.
   *
   * @param message Received message.
   */
  private async command(message: Message) {
    // commands
    const prefixRegex = XRegExp.build(
      `(?:^${XRegExp.escape(this.config.prefix)})(\\S*)\\s*(.*)`, {}, "s"
    );

    const toks = message.content.match(prefixRegex);
    if (!toks) return false;
    const [, cmd, args] = toks;

    if (!this.commands.hasOwnProperty(cmd)) return false;
    const cb = this.commands[cmd].bind(this);

    try {
      const logItem = await cb(message, ...args.split(/\s+/gu));
      const logString = logItem === undefined
        ? ""
        : logItem instanceof Message ? messageSummary(logItem) : String(logItem);

      log(`success:command/${cmd}`, logString);
    } catch (err) {
      log(`error:command/${cmd}`, err);
    }
    return true;
  }

  /**
   * Sends an x2i string (but also could be used for simple embeds)
   *
   * @param message Message to reply to
   */
  private async sendX2iResponse(message: Message) {
    const responses = this.createX2iResponse(message);
    if (responses.length === 0) return false;
    const logCode = responses.length === 1 ? "all" : "partial";

    const respond = (stat: string, ...ms: any[]) =>
      log(`${stat}:x2i/${logCode}`, messageSummary(message), ...ms);

    try {
      const responseMessages: Message[] = [];
      const reactionPromises: Promise<any>[] = [];
      for (const response of responses) {
        const responseMessage = await reply(message, this.bot, response);
        if (!responseMessage) continue;
        reactionPromises.push(this.addDeleteReaction(responseMessage));
        responseMessages.push(responseMessage);
      }
      await Promise.all(
        reactionPromises.concat(this.db.addMessage(message, responseMessages))
      );
      respond("success");
    } catch (err) {
      respond("error", err);
    }

    return true;
  }

  private createX2iResponse(message: Message): (Omit<MessageOptions, "flags"> | string)[] {
    const results = this.x2i?.search(message.content)?.join("\n") ?? "";
    if (results.length > this.config.timeoutChars) {
      const timeoutMessage = formatObject(
        this.config.timeoutMessage,
        { user: message.client.user, config: this.config },
      );
      return [
        `${results.slice(0, this.config.timeoutChars - 1)}…`,
        typeof timeoutMessage === "string"
          ? timeoutMessage
          : { embeds: [new EmbedBuilder(timeoutMessage)] },
      ];
    } else if (results.length === 0) return [];
    return [results];
  }

  private async updateReply(oldMsg: Message | PartialMessage, newMsg: Message | PartialMessage) {
    if ((oldMsg.author ?? newMsg.author)?.id === this.bot.user?.id
        || newMsg.partial
        || Date.now() - oldMsg.createdTimestamp > oneDay) return;
    const replies = (await this.db.getReplies(oldMsg)).filter(el => el.shouldEdit);
    if (replies.length === 0) return;

    const responses = this.createX2iResponse(newMsg);

    await Promise.all(replies.map(async (el, i) => {
      let message: Message;
      try {
        message = await newMsg.channel.messages.fetch(el.message);
      } catch (e) {
        if (e instanceof DiscordAPIError && e.code === 10008) {
          // message already deleted
          await this.db.deleteMessage({ id: el.message });
        } else {
          log(
            "error:edit",
            `${newMsg.guild?.name ?? "unknown guild"}: Unable to fetch message ${el.message}: ${e}`
          );
        }
        return;
      }

      if (!responses[i]) {
        try {
          await message.delete();
          await this.db.deleteMessage(message);
        } catch (e) {
          log(
            "error:edit",
            `${message.guild?.name ?? "unknown guild"}: Unable to delete message '${message}': ${e}`
          );
        }
      } else if (responses[i] !== message.content) {
        try {
          await message.edit(responses[i]);
        } catch (e) {
          log(
            "error:edit",
            `${message.guild?.name ?? "unknown guild"}: Unable to edit message '${message}': ${e}`
          );
        }
      }
    }));

    if (responses.length > replies.length) {
      const newMessages: Message[] = [];
      const reactionPromises: Promise<any>[] = [];
      for (let i = replies.length; i < responses.length; ++i) {
        const newReply = await reply(newMsg, this.bot, responses[i]);
        if (!newReply) continue;
        reactionPromises.push(this.addDeleteReaction(newReply));
        newMessages.push(newReply);
      }
      await Promise.all(reactionPromises.concat(this.db.addMessage(newMsg, newMessages)));
    }
  }

  private async serverCountChanged() {
    if (!this.config.botlistToken || !this.config.botlistUrl) return;

    const serverCount = this.bot.guilds.cache.size;
    log("info", `Server count is now ${serverCount}.`);

    try {
      await fetch(
        strFormat(
          this.config.botlistUrl,
          { user: this.bot.user, config: this.config },
        ),
        {
          body: `{"guildCount":${serverCount}}`,
          headers: {
            Authorization: this.config.botlistToken,
            "Content-Type": "application/json",
          },
          method: "POST",
        },
      );
    } catch (err) {
      log("error", "Failed to post server count:", err);
    }
  }

  private async checkPendingConfirmation(message: Message) {
    const index = this.pendingConfirmations.findIndex(el =>
      el.author === message.author.id && el.channel === message.channelId);
    if (index === -1) return;

    const { timeout, onConfirm } = this.pendingConfirmations[index];
    clearTimeout(timeout);

    this.pendingConfirmations.splice(index, 1);

    // we know that `content` is either 'y' or 'n', though maybe uppercase or with whitespace
    if (message.content.trim().toLowerCase() === "y") {
      return onConfirm(message);
    } else {
      return reply(message, this.bot, "Cancelled!");
    }
  }

  /**
   * Acts for a response to a message.
   *
   * @param message Message to parse for responses
   */
  protected parse = async (message: Message) => {
    if (message.author.bot) return;

    if (
      // check that...
      // - there is a user and emoji to make the reaction
      this.config.pingEmoji && this.bot.user
      // - the message mentions the user
      && message.mentions.has(this.bot.user)
      // - the mention isn't via a reply
      && message.mentions.repliedUser?.id !== this.bot.user.id
      // - the mention isn't @here or @everyone
      && !message.mentions.everyone
    ) {
      this.reactIfAllowed(message, this.config.pingEmoji)
        .catch(() => undefined);
    }

    if (await this.sendX2iResponse(message)) return;
    if (await this.command(message)) return;

    const cleanedText = message.content.trim().toLowerCase();
    if (cleanedText === "y" || cleanedText === "n") {
      const response = await this.checkPendingConfirmation(message);
      if (response) log("success:confirmation", String(response));
    }
  };

  /**
   * Acts for a reaction to potentially delete a message.
   * 
   * @param reaction Message reaction event.
   * @param user User that prompted reaction.
   */
  protected reactDeleteMessage = async (
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser
  ) => {
    if (user.id === this.bot.user?.id
        || reaction.emoji.name !== this.config.deleteEmoji
        || user.id !== await this.db.getMessageAuthor(reaction.message)) { return; }

    await reaction.message.delete();
    await this.db.deleteMessage(reaction.message);
  };

  public async addDeleteReaction(message: Message) {
    if (!this.bot.user) return;
    const reaction = await this.reactIfAllowed(message, this.config.deleteEmoji);
    if (!reaction) return;

    const settings = await this.db.getSettings(message.guildId);
    if (settings.reactRemovalTimeout > 0) {
      setTimeout(
        async user => {
          try {
            await reaction.users.remove(user);
          } catch (e) {
            if (!(e instanceof DiscordAPIError && e.code === 10008)) {
              log("error", "reaction removal", `Error removing reaction: ${e}`);
            }
          }
        },
        settings.reactRemovalTimeout * 60000,
        this.bot.user
      );
    }
  }

  public async reactIfAllowed(message: Message, emoji: string) {
    const isExternal = emoji.startsWith("<") && emoji.endsWith(">");
    if (this.bot.user && (
      // @ts-expect-error The thing it complains about is why the `?.` is there
      message.channel.permissionsFor?.(this.bot.user)?.has(
        PermissionFlagsBits.AddReactions | PermissionFlagsBits.ReadMessageHistory | (
          isExternal ? PermissionFlagsBits.UseExternalEmojis : 0n
        )
      ) ?? true
    )) {
      try {
        return await message.react(emoji);
      } catch (e) {
        log(
          "error:react",
          `${message.guild?.name ?? "unknown guild"}: Unable to react with ${emoji}: ${e}`
        );
      }
    }
  }

  /**
   * Require confirmation to go through with an action.
   * @param onConfirm What to do when confirmation is received.
   * @param message The message to reply to.
   * @param command Which command is awaiting confirmation.
   * @param response The warning text asking for confirmation.
   * @param allowOthers Whether to allow multiple people to perform this action in the same channel.
   */
  public async addConfirmation<T>(
    onConfirm: (confirmation: Message) => T,
    message: Message,
    command: string,
    response: string | MessageOptions,
    allowOthers: boolean
  ) {
    // Check for an existing confirmation
    const existingConfirmationIndex = this.pendingConfirmations.findIndex(el =>
      el.channel === message.channelId &&
      (el.command === command || el.author === message.author.id));
    if (existingConfirmationIndex !== -1) {
      const previous = this.pendingConfirmations[existingConfirmationIndex];
      if (previous.author === message.author.id && previous.command === command) {
        // treat repeated command as confirmation
        clearTimeout(previous.timeout);
        this.pendingConfirmations.splice(existingConfirmationIndex, 1);
        return previous.onConfirm(message) as T;
      } else if (previous.command !== command || !allowOthers || !previous.allowOthers) {
        // prevent simultaneous requests from different commands
        return reply(message, this.bot, "There's already a pending confirmation in this channel!");
      }
    }

    const respMsg = await reply(message, this.bot, response);
    if (!respMsg) return;

    const timeout = setTimeout(async () => {
      try {
        await respMsg.edit("Cancelled automatically due to timeout.");
        log("info/confirmation", "Confirmation timed out");
      } catch (err) {
        if (err instanceof DiscordAPIError && err.code === 10008) return;
        log(
          "error/confirmation",
          `${respMsg.guild?.name ?? "unknown guild"}: Unable to edit message '${respMsg}': ${err}`
        );
      } finally {
        const index = this.pendingConfirmations.findIndex(el => el.timeout === timeout);
        if (index !== -1) this.pendingConfirmations.splice(index, 1);
      }
    }, this.config.confirmationTimeout * 1000);

    this.pendingConfirmations.push({
      allowOthers,
      command,
      onConfirm,
      timeout,
      author: message.author.id,
      channel: message.channelId,
    });
  }

  /**
   * Register multiple commands at once.
   */
  public registerCommands(callbacks: ICommands) {
    for (const [name, cmd] of Object.entries(callbacks)) {
      this.register(name, cmd);
    }
  }

  /**
   * Register a single custom command.
   *
   * @param command Command name that comes after prefix. Name must be `\S+`.
   * @param callback Callback upon seeing the name. `this` will be bound automatically.
   */
  public register(command: string, callback: CommandCallback) {
    this.commands[command] = callback;
  }
}
