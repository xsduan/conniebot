import SQL from "sql-template-strings";
import sqlite, { Database } from "sqlite";

import { logMessage } from "./utils";

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

  /* tslint:disable: max-line-length */
  /**
   * Stacktrace, if available. (see
   * [`Error.prototype.stack`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/Stack))
   *
   * `stack` is technically non-standard, and not every throw will give an Error object, so we
   * default to {@link message}.
   */
  /* tslint:enable: max-line-length */
  stacktrace: string;

  /* tslint:disable: max-line-length */
  /**
   * Message, if available. (first tries
   * [`Error.message`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/message),
   * then defaults to stringifying)
   */
  /* tslint:enable: max-line-length */
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
   */
  constructor(dbFile: string) {
    if (!dbFile.endsWith(".sqlite")) {
      logMessage("warn", "Database file is not marked as `.sqlite`.");
    }

    this.db = this.init(dbFile);
  }

  /**
   * Open a file and initialize the tables if they haven't already been created.
   *
   * @param fname Database filename. Relative to command directory.
   */
  private async init(fname: string) {
    const db = await sqlite.open(fname);

    await Promise.all([
      db.run(`CREATE TABLE IF NOT EXISTS notifs (
        event VARCHAR(50) PRIMARY KEY,
        channel TEXT NOT NULL
      )`),
      db.run(`CREATE TABLE IF NOT EXISTS unsentErrors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATETIME NOT NULL,
        stacktrace TEXT DEFAULT NULL,
        message TEXT DEFAULT NULL
      );`),
      db.run(`CREATE TABLE IF NOT EXISTS sentErrors (
        id INTEGER PRIMARY KEY,
        date DATETIME NOT NULL,
        dateSent DATETIME NOT NULL,
        stacktrace TEXT DEFAULT NULL,
        message TEXT DEFAULT NULL
      );`),
    ]);

    return db;
  }

  public async getChannel(event: string) {
    const db = await this.db;
    const row = await db.get<INotifRow>(
      SQL`SELECT event, channel FROM notifs WHERE event = ${event.substr(0, 50)}`,
    );

    return row.channel;
  }

  public async setChannel(event: string, channel: string) {
    return (await this.db).run(
      SQL`INSERT INTO notifs(event, channel) VALUES(${event.substr(0, 50)}, ${channel})
        ON CONFLICT(event) DO UPDATE SET channel=excluded.channel`,
    );
  }

  public async getUnsentErrors() {
    return (await this.db).all<IUnsentErrorsRow>(`SELECT * FROM unsentErrors`);
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

    const { date, stacktrace, message } = await db.get(
      SQL`SELECT * FROM unsentErrors WHERE id = ${id}`,
    );

    await db.run(
      SQL`INSERT OR IGNORE INTO sentErrors(id, date, dateSent, stacktrace, message)
              VALUES(${id}, ${date}, ${new Date()}, ${stacktrace}, ${message})`);

    await db.run(SQL`DELETE FROM unsentErrors WHERE id = ${id}`);
  }
}
