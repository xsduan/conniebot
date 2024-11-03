import { Database, open } from "sqlite";
import Postgrator from "postgrator";
import SQL from "sql-template-strings";
import sqlite3 from "sqlite3";

import { Message, PartialMessage } from "discord.js";
import { log } from "./utils/index.js";

/**
 * Key-value table of events.
 *
 * Currently used events:
 * - `restart`: Notify restart.
 * - `errors`: Notify errors. (may want to keep stack traces secret, etc)
 */
interface INotifRow {
  /**
   * Event name (cuts off at 50 characters).
   */
  event: string;

  /**
   * Channel ID that corresponds to the string, taken from
   * [`Channel.id`](https://discord.js.org/#/docs/main/stable/class/Channel?scrollTo=id).
   */
  channel: string;
}

/**
 * A whole bunch of unsent errors.
 */
interface IUnsentErrorsRow {
  /**
   * Autoincremented ID column.
   */
  id: number;

  /**
   * Date that error happened (more specifically, when it was caught).
   */
  date: Date;

  /**
   * Stacktrace, if available. (see
   * [`Error.prototype.stack`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/Stack))
   *
   * `stack` is technically non-standard, and not every throw will give an Error object, so we
   * default to {@link message}.
   */
  stacktrace: string;

  /**
   * Message, if available. (first tries
   * [`Error.message`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/message),
   * then defaults to stringifying)
   */
  message: string;
}

/**
 * Sent errors, for future auditing purposes.
 */
interface ISentErrorsRow extends IUnsentErrorsRow {
  /**
   * Date that error was sent.
   */
  dateSent: Date;
}

/**
 * Server settings.
 */
export interface IServerSettings {
  /**
   * The ID of the server.
   */
  server: string;
  /**
   * When to send help in DMs.
   */
  dmHelp: 0 | 1 | 2 | 3 | 4;
  /**
   * How long to wait before removing the delete react.
   */
  reactRemovalTimeout: number;
}

/**
 * The default server settings.
 */
export const defaultSettings: Readonly<Omit<IServerSettings, "server">> = {
  dmHelp: 0,
  reactRemovalTimeout: 7,
};

/**
 * Database manager for Conniebot. Uses SQLite.
 */
export default class ConniebotDatabase {
  /**
   * Pending or completed database connection.
   */
  private db: Promise<Database>;

  /**
   * @param dbFile Filename of database file. Should be a `.sqlite` file. Relative to command
   * directory.
   * @param migrationPattern Glob pattern to match all migration files. Relative to command
   * directory.
   */
  constructor(dbFile: string, migrationPattern: string) {
    if (!dbFile.endsWith(".sqlite")) {
      log("warn", "Database file is not marked as `.sqlite`.");
    }

    this.db = this.init(dbFile, migrationPattern);
  }

  /**
   * Open a file and initialize the tables if they haven't already been created.
   *
   * @param filename Database filename. Relative to command directory.
   * @param migrationPattern Glob pattern to match all migration files. Relative to command
   * directory.
   */
  private async init(filename: string, migrationPattern: string) {
    // Connect to the database
    const db = await open({ filename, driver: sqlite3.Database });

    // Run migrations
    const pg = new Postgrator({
      migrationPattern,
      driver: "sqlite3",
      async execQuery(query) {
        return { rows: await db.all(query) };
      },
    });

    pg.on("migration-started", migration => {
      log("info", `Running ${migration.filename}...`);
    });

    await pg.migrate();

    // Set up the cycle to delete sufficiently old records
    const oneDay = 24 * 60 * 60 * 1000;
    const deleteOldMessages = async () => {
      const result = await db.run(
        SQL`DELETE FROM messageAuthors WHERE createdAt < unixepoch('now', '-29 days')`
      );
      if (result.changes) {
        log("info:dailyPurge", `Deleted ${result.changes} rows`);
      }
    };

    await deleteOldMessages();
    setInterval(deleteOldMessages, oneDay);

    return db;
  }

  public async getChannel(event: string) {
    const db = await this.db;
    const row = await db.get<INotifRow>(
      SQL`SELECT event, channel FROM notifs WHERE event = ${event.substring(0, 50)}`,
    );

    return row?.channel;
  }

  public async setChannel(event: string, channel: string) {
    return (await this.db).run(
      SQL`INSERT INTO notifs(event, channel) VALUES(${event.substring(0, 50)}, ${channel})
        ON CONFLICT(event) DO UPDATE SET channel=excluded.channel`,
    );
  }

  public async getUnsentErrors() {
    return (await this.db).all<IUnsentErrorsRow[]>(`SELECT * FROM unsentErrors`);
  }

  public async addError(err: any) {
    return (await this.db).run(
      SQL`INSERT INTO unsentErrors(date, stacktrace, message)
        VALUES(${new Date()}, ${err.stack}, ${err.message || String(err)})`,
    );
  }

  /**
   * Migrate error to Sent Errors table, black-holing it if the ID already exists for some reason.
   *
   * @param id Error ID to migrate.
   */
  public async moveError(id: number) {
    const db = await this.db;

    const unsentErrors = await db.get(
      SQL`SELECT * FROM unsentErrors WHERE id = ${id}`,
    );

    if (!unsentErrors) { return; }
    const { date, stacktrace, message } = unsentErrors;

    await db.run(
      SQL`INSERT OR IGNORE INTO sentErrors(id, date, dateSent, stacktrace, message)
              VALUES(${id}, ${date}, ${new Date()}, ${stacktrace}, ${message})`);

    await db.run(SQL`DELETE FROM unsentErrors WHERE id = ${id}`);
  }

  public async addMessage(original: Message, messages: Message[], shouldEdit = true) {
    const db = await this.db;
    const statements = messages.map(async msg => db.run(
      SQL`INSERT INTO messageAuthors(message, author, original, shouldEdit, createdAt)
          VALUES(
            ${msg.id},
            ${original.author.id},
            ${original.id},
            ${shouldEdit ? 1 : 0},
            ${original.createdTimestamp / 1000}
          )`));
    return Promise.all(statements);
  }

  public async getMessageAuthor(message: Message | PartialMessage) {
    const db = await this.db;
    const result = await db.get<{ author: string }>(
      SQL`SELECT CAST(author AS TEXT) AS author FROM messageAuthors WHERE message = ${message.id}`
    );
    return result?.author;
  }

  public async getReplies(message: Message | PartialMessage) {
    return (await this.db).all<{ message: string, shouldEdit: 0 | 1 }[]>(
      SQL`SELECT CAST(message AS TEXT) AS message, shouldEdit FROM messageAuthors
        WHERE original = ${message.id}`
    );
  }

  public async deleteMessage(message: { id: string }) {
    return (await this.db).run(SQL`DELETE FROM messageAuthors WHERE message = ${message.id}`);
  }

  public async getSettings(
    server: string | null
  ): Promise<Omit<IServerSettings, "server"> & { server: string | null }>;
  public async getSettings(server: string): Promise<IServerSettings>;

  public async getSettings(server: string | null) {
    const db = await this.db;
    const settings = await db.get<IServerSettings>(
      SQL`SELECT * FROM serverSettings WHERE server = ${server}`
    );

    return settings ?? {
      ...defaultSettings,
      server,
    };
  }

  public async updateSettings(
    server: string,
    newSettings: Partial<IServerSettings>
  ) {
    const db = await this.db;

    const oldSettings = await db.get<IServerSettings>(
      SQL`SELECT * FROM serverSettings WHERE server = ${server}`
    ) ?? defaultSettings;

    const settings: typeof oldSettings = {
      ...oldSettings,
      ...newSettings,
    };

    await db.run(
      SQL`INSERT OR REPLACE INTO serverSettings(server, dmHelp, reactRemovalTimeout)
        VALUES(${server}, ${settings.dmHelp}, ${settings.reactRemovalTimeout})`
    );
  }

  public async deleteServerSettings(server: string) {
    return (await this.db).run(SQL`DELETE FROM serverSettings WHERE server = ${server}`);
  }

  /**
   * Remove all mentions of a user ID from the database.
   */
  public async purgeUser(userId: string) {
    const db = await this.db;
    return db.run(
      SQL`DELETE FROM messageAuthors WHERE author = ${userId}`
    );
  }
}
