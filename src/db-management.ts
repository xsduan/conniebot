import SQL from "sql-template-strings";
import sqlite, { Database } from "sqlite";

interface INotifRow {
  event: string;
  channel: string;
}

interface IUnsentErrorsRow {
  id: number;
  date: Date;
  stacktrace: string;
  message: string;
}

interface ISentErrorsRow extends IUnsentErrorsRow {
  dateSent: Date;
}

export default class ConniebotDatabase {
  private db: Promise<Database>;

  constructor(dbFile: string) {
    if (!dbFile.endsWith(".sqlite")) {
      console.log("Database file is not marked as `.sqlite`.");
    }

    this.db = this.init(dbFile);
  }

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
      SQL`INSERT INTO notifs(event, channel) VALUES(${event}, ${channel})
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
