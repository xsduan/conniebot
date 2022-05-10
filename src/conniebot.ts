import { readdir, readFile } from "fs";
import { request } from "https";
import * as path from "path";
import { promisify } from "util";

import {
  Client,
  ClientOptions,
  DiscordAPIError,
  Message,
  MessageEmbed,
  MessageEmbedOptions,
  MessageOptions,
  MessageReaction,
  PartialMessage,
  PartialMessageReaction,
  PartialUser,
  User,
} from "discord.js";

import c from "config";
import * as yaml from "js-yaml";
import XRegExp from "xregexp";

import ConniebotDatabase from "./helper/db-management.js";
import { notifyNewErrors, notifyRestart, updateActivity } from "./helper/startup.js";
import { formatObject, strFormat } from "./helper/utils/format.js";
import { log, messageSummary, reply } from "./helper/utils/index.js";
import X2IMatcher, { IReplaceSource } from "./x2i/index.js";

export type CommandCallback =
  (this: Conniebot, message: Message, ...args: string[]) => Promise<any>;

export interface IConniebotConfig {
  readonly activeMessage?: string;
  readonly botlistToken?: string;
  readonly botlistUrl?: string;
  readonly clientOptions: Readonly<ClientOptions>;
  readonly database: string;
  readonly deleteEmoji: string;
  readonly help: Readonly<MessageEmbedOptions> | string;
  readonly migrations: string;
  readonly owner: string;
  readonly pingEmoji?: string;
  readonly prefix: string;
  readonly timeoutChars: number;
  readonly timeoutMessage: Readonly<MessageEmbedOptions> | string;
  readonly token: string;
  readonly x2iFiles: string;
  readonly invite: Readonly<MessageEmbedOptions> | string;
}

export interface ICommands {
  [key: string]: CommandCallback;
}

const readdirPromise = promisify(readdir);
const readFilePromise = promisify(readFile);

// the length of one day, in ms
const oneDay = 1000 * 60 * 60 * 24;

export default class Conniebot {
  public bot: Client;
  public db: ConniebotDatabase;
  public alphabetList?: string;
  public readonly config: IConniebotConfig;

  private commands: ICommands;
  private x2i?: X2IMatcher;

  private ready: boolean = false;

  constructor(config: IConniebotConfig) {
    log("verbose", "Starting to load bot...");

    this.config = config;

    this.bot = new Client(c.util.cloneDeep(config.clientOptions, 5));
    this.db = new ConniebotDatabase(this.config.database, this.config.migrations);
    this.commands = {};

    this.bot
      .on("ready", () => this.startup())
      .on("messageCreate", message => {
        if (this.ready) {
          return this.parse(message);
        }
      })
      .on("error", err => {
        if (err && err.message && err.message.includes("ECONNRESET")) {
          return log("warn", "connection reset. oops!");
        }
        this.panicResponsibly(err);
      })
      .on("messageReactionAdd", (message, user) => {
        if (this.ready) {
          return this.reactDeleteMessage(message, user);
        }
      })
      .on("messageUpdate", (oldMsg, newMsg) => {
        if (this.ready) {
          this.updateReply(oldMsg, newMsg);
        }
      })
      .on("guildCreate", () => {
        if (this.ready) {
          this.serverCountChanged();
        }
      })
      .on("guildDelete", () => {
        if (this.ready) {
          this.serverCountChanged();
        }
      })
      .login(this.config.token);

    process.once("uncaughtException", this.panicResponsibly);
  }

  private async startup() {
    log("info", "Bot ready. Setting up...");

    if (this.config.activeMessage) {
      updateActivity(this.bot, this.config.activeMessage);
    }

    notifyRestart(this.bot, this.db);
    notifyNewErrors(this.bot, this.db);

    // fetch the server list and post the count to bots.gg
    await this.bot.guilds.fetch();
    this.serverCountChanged();

    this.x2i = await this.loadKeys();
    this.alphabetList = this.x2i.alphabetList;
    log("info", "Setup complete.");
    this.ready = true;
  }

  /**
   * Load keys from files in the x2i data folder.
   */
  private async loadKeys() {
    log("info", "Loading X2I keys from: \x1b[96m%s\x1b[0m...", this.config.x2iFiles);

    const x2iDir = this.config.x2iFiles;
    const x2iFiles = await readdirPromise(x2iDir);
    const x2iData = await Promise.all(x2iFiles.map(
      fname => readFilePromise(path.resolve(x2iDir, fname), "utf8"),
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
      `(?:^${XRegExp.escape(this.config.prefix)})(\\S*) ?(.*)`, {},
    );

    const toks = message.content.match(prefixRegex);
    if (!toks) return;
    const [, cmd, args] = toks;

    if (!this.commands.hasOwnProperty(cmd)) return;
    const cb = this.commands[cmd].bind(this);

    try {
      const logItem = await cb(message, ...args.split(" "));
      log(`success:command/${cmd}`, logItem === undefined ? "" : String(logItem));
    } catch (err) {
      log(`error:command/${cmd}`, err);
    }
  }

  /**
   * Sends an x2i string (but also could be used for simple embeds)
   *
   * @param message Message to reply to
   */
  private async sendX2iResponse(message: Message) {
    const responses = await this.createX2iResponse(message);
    if (responses.length === 0) return false;
    const logCode = responses.length === 1 ? "all" : "partial";

    const respond = (stat: string, ...ms: any[]) =>
      log(`${stat}:x2i/${logCode}`, messageSummary(message), ...ms);

    try {
      const responseMessages = [];
      for (const response of responses) {
        const responseMessage = await reply(message, this.bot, response);
        this.reactIfAllowed(responseMessage, this.config.deleteEmoji);
        responseMessages.push(responseMessage);
      }
      await this.db.addMessage(message, responseMessages);
      respond("success");
    } catch (err) {
      respond("error", err);
    }

    return true;
  }

  private async createX2iResponse(message: Message): Promise<(MessageOptions | string)[]> {
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
          : { embeds: [new MessageEmbed(timeoutMessage)] },
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

    const responses = await this.createX2iResponse(newMsg);

    await Promise.all(replies.map(async (el, i) => {
      let message: Message;
      try {
        message = await newMsg.channel.messages.fetch(el.message);
      } catch (e) {
        if (e instanceof DiscordAPIError) {
          if (e.code === 10008) {
            // message already deleted
            await this.db.deleteMessage({ id: el.message });
          }

          log(
            "error:edit",
            `${newMsg.guild?.name ?? "unknown guild"}: Unable to edit message ${el.message}`
          );
          return;
        }
        throw e;
      }

      if (!responses[i]) {
        await message.delete();
        await this.db.deleteMessage(message);
      } else if (responses[i] !== message.content) {
        await message.edit(responses[i]);
      }
    }));

    if (responses.length > replies.length) {
      const newMessages: Message[] = [];
      for (let i = replies.length; i < responses.length; ++i) {
        const newReply = await newMsg.reply(responses[i]);
        this.reactIfAllowed(newReply, this.config.deleteEmoji);
        newMessages.push(newReply);
      }
      this.db.addMessage(newMsg, newMessages);
    }
  }

  private async serverCountChanged() {
    // send server count to bots.gg
    if (this.config.botlistToken && this.config.botlistUrl && this.bot.user) {

      const req = request(
        strFormat(
          this.config.botlistUrl,
          { user: this.bot.user, config: this.config },
        ),
        {
          headers: {
            Authorization: this.config.botlistToken,
            "Content-Type": "application/json",
          },
          method: "POST",
        }
      );

      req.on("error", err => log("error", "Failed to post server count:", err));

      const serverCount = this.bot.guilds.cache.size;

      req.write(`{"guildCount":${serverCount}}`);
      req.end();

      log("info", `Server count is now ${serverCount}.`);
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
      this.reactIfAllowed(message, this.config.pingEmoji);
    }

    if (await this.sendX2iResponse(message)) return;
    await this.command(message);
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
        || user.id !== await this.db.getMessageAuthor(reaction.message)
        || reaction.emoji.name !== this.config.deleteEmoji) { return; }

    await reaction.message.delete();
    await this.db.deleteMessage(reaction.message);
  };

  public async reactIfAllowed(message: Message, emoji: string) {
    const isExternal = emoji.length > 1 && emoji.startsWith("<") && emoji.endsWith(">");
    if (this.bot.user && (
      // @ts-expect-error The thing it complains about is why the `?.` is there
      message.channel.permissionsFor?.(this.bot.user)?.has(
        isExternal
          ? ["ADD_REACTIONS", "USE_EXTERNAL_EMOJIS", "READ_MESSAGE_HISTORY"]
          : ["ADD_REACTIONS", "READ_MESSAGE_HISTORY"]
      ) ?? true
    )) {
      try {
        await message.react(emoji);
      } catch (e) {
        if (e instanceof DiscordAPIError) {
          log(
            "error:react",
            `${message.guild?.name ?? "unknown guild"}: Unable to react with ${emoji}`
          );
        } else throw e;
      }
    }
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
