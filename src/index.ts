import c from "config";
import { Client, ClientOptions, Message, RichEmbed } from "discord.js";
import process from "process";
import OuterXRegExp from "xregexp";

import ConniebotDatabase from "./db-management";
import embed from "./embed";
import startup from "./startup";
import { log, messageSummary } from "./utils";
import x2i from "./x2i";

export type CommandCallback =
  (this: Conniebot, message: Message, ...args: string[]) => Promise<any>;

export interface ICommands {
  [key: string]: CommandCallback;
}

export default class Conniebot {
  public bot: Client;
  public db: ConniebotDatabase;
  private commands: ICommands;

  constructor(token: string, dbFile: string, clientOptions?: ClientOptions) {
    this.bot = new Client(clientOptions);
    this.db = new ConniebotDatabase(dbFile);
    this.commands = {};

    this.bot.on("ready", () => startup(this.bot, this.db))
      .on("message", this.parse)
      .on("error", err => {
        if (err && err.message && err.message.includes("ECONNRESET")) {
          return log("warn", "connection reset. oops!");
        }
        this.panicResponsibly(err);
      })
      .login(token);

    process.once("uncaughtException", this.panicResponsibly);
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
  }

  /**
   * Looks for a reply message.
   *
   * @param message Received message.
   */
  private async command(message: Message) {
    // commands
    const prefixRegex = OuterXRegExp.build(
      `(?:^${OuterXRegExp.escape(c.get("prefix"))})(\\S*) ?(.*)`, [],
    );

    const toks = message.content.match(prefixRegex);
    if (!toks) return;
    const [, cmd, args] = toks;

    // assume that command has already been bound
    // no way currently to express this without clearing the types
    const cb: any = this.commands[cmd];
    if (!cb) return;

    try {
      const logItem = await cb(message, ...args.split(" "));
      log(`success:command/${cmd}`, logItem);
    } catch (err) {
      log(`error:command/${cmd}`, err);
    }
  }

  /**
   * Sends an x2i string (but also could be used for simple embeds)
   *
   * @param message Message to reply to
   */
  private async x2iExec(message: Message) {
    let results = x2i(message.content);
    const parsed = Boolean(results && results.length !== 0);
    if (parsed) {
      const response = new RichEmbed().setColor(
        c.get("embeds.colors.success"),
      );
      let logCode = "all";

      // check timeout
      const charMax = parseInt(c.get("embeds.timeoutChars"), 10);
      if (results.length > charMax) {
        results = `${results.slice(0, charMax - 1)}…`;

        response
          .addField("Timeout", c.get("embeds.timeoutMessage"))
          .setColor(c.get("embeds.colors.warning"));

        logCode = "partial";
      }

      response.setDescription(results);

      const respond = (stat: string, ...ms: any[]) =>
        log(`${stat}:x2i/${logCode}`, messageSummary(message), ...ms);

      try {
        await embed(message.channel, response);
        respond("success");
      } catch (err) {
        respond("error", err);
      }
    }

    return parsed;
  }

  /**
   * Acts for a response to a message.
   *
   * @param message Message to parse for responses
   */
  protected parse = async (message: Message) => {
    if (message.author.bot) return;
    if (await this.x2iExec(message)) return;
    await this.command(message);
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
    this.commands[command] = callback.bind(this);
  }
}
