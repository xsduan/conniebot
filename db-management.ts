import c from "config";
import { Database } from "sqlite3";

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
  private db: Database;

  constructor(dbFile?: string) {
    dbFile = dbFile || c.get("database");

    if (!dbFile) {
      throw TypeError("No database filename listed.");
    }

    if (!dbFile.endsWith(".sqlite")) {
      console.log("Database file is not marked as `.sqlite`.");
    }

    this.db = new Database(dbFile).exec(
      `CREATE TABLE IF NOT EXISTS notifs (
        event VARCHAR(50) PRIMARY KEY,
        channel TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS unsentErrors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATETIME NOT NULL,
        stacktrace TEXT DEFAULT NULL,
        message TEXT DEFAULT NULL
      );

      CREATE TABLE IF NOT EXISTS sentErrors (
        id INTEGER PRIMARY KEY,
        date DATETIME NOT NULL,
        dateSent DATETIME NOT NULL,
        stacktrace TEXT DEFAULT NULL,
        message TEXT DEFAULT NULL
      );`,
    );
  }

  public async getChannel(event: string) {
    return new Promise<string | undefined>((y, n) => this.db.get(
      `SELECT event, channel FROM notifs WHERE event = ?`,
      event.substr(0, 50),
      (err, { channel }: INotifRow = {} as any) => err ? n(err) : y(channel),
    ));
  }

  public async setChannel(event: string, channel: string) {
    return new Promise((y, n) => this.db.run(
      `INSERT INTO notifs(event, channel) VALUES($event, $channel)
        ON CONFLICT(event) DO UPDATE SET channel=excluded.channel`,
      { $event: event, $channel: channel },
      err => err ? n(err) : y(),
    ));
  }

  public async getUnsentErrors() {
    return new Promise<IUnsentErrorsRow[]>((y, n) => this.db.all(
      `SELECT * FROM unsentErrors`,
      (err, rows: IUnsentErrorsRow[]) => err ? n(err) : y(rows),
    ));
  }

  public async addError(err: any) {
    return new Promise((y, n) => this.db.run(
      `INSERT INTO unsentErrors(date, stacktrace, message)
      VALUES($date, $stacktrace, $message)`,
      {
        $date: new Date(),
        $message: String(err),
        $stacktrace: err.stack,
      },
      insertErr => insertErr ? n(insertErr) : y(),
    ));
  }

  public async moveError(id: number) {
    return new Promise((finish, fail) => {
      this.db.get(
        `SELECT * FROM unsentErrors WHERE id = ?`, id,
        (selectErr, row: IUnsentErrorsRow) => {
          if (selectErr) {
            return fail(selectErr);
          }

          if (!row) {
            return fail("No such row exists.");
          }

          const { date, stacktrace, message } = row;

          this.db.run(
            `INSERT OR IGNORE INTO sentErrors(id, date, dateSent, stacktrace, message)
              VALUES($id, $date, $dateSent, $stacktrace, $message)`,
            {
              $date: date,
              $dateSent: new Date(),
              $id: id,
              $message: message,
              $stacktrace: stacktrace,
            },
            moveErr => {
              if (moveErr) {
                return fail(moveErr);
              }

              this.db.run(
                `DELETE FROM unsentErrors WHERE id = ?`, id,
                deleteErr => deleteErr ? fail(deleteErr) : finish(),
              );
            },
          );
        },
      );
    });
  }
}
