import c from "config";
import { Client } from "discord.js";

import ConniebotDatabase from "./db-management";
import { isTextChannel, logMessage, sendMessage } from "./utils";

/**
 * Send notification to channel for reboot.
 */
async function notifyRestart(bot: Client, db: ConniebotDatabase) {
  const channelId = await db.getChannel("restart");
  if (!channelId) {
    return logMessage("warn", "Couldn't find channel to notify.");
  }

  const channel = bot.channels.get(channelId);
  if (!channel || !isTextChannel(channel)) {
    return logMessage("warn", `Channel ${channelId} doesn't exist or is not a text channel.`);
  }

  try {
    await channel.send(`Rebooted at ${new Date()}.`);
    logMessage("info", `Notified ${channel} (#${channel.name || "??"}) of restart.`);
  } catch (err) {
    logMessage("error", err);
  }
}

/**
 * Notify channel of any new errors that haven't been able to send.
 */
async function notifyNewErrors(bot: Client, db: ConniebotDatabase) {
  const [errors, errorChannelId] = await Promise.all(
    [db.getUnsentErrors(), db.getChannel("errors")],
  );

  if (!errors.length) return;
  if (!errorChannelId) {
    return logMessage("warn", "Couldn't find error channel.");
  }

  const errorChannel = bot.channels.get(errorChannelId);
  if (!errorChannel || !isTextChannel(errorChannel)) {
    return logMessage("warn", "Can't use listed error channel. (nonexistent or not text)");
  }

  sendMessage(`Found ${errors.length} errors on startup.`, errorChannel);

  for (const { id, date, stacktrace, message } of errors) {
    const errorMessage = `at ${new Date(date)}:\n\`\`\`${stacktrace || message}\`\`\``;
    if (sendMessage(errorMessage, errorChannel)) {
      await db.moveError(id);
    }
  }
}

/**
 * Update activity of bot.
 */
async function updateActivity(bot: Client) {
  if (c.has("activeMessage")) {
    logMessage("info", "Changing game status...");
    try {
      await bot.user.setActivity(c.get("activeMessage"));
      logMessage("info", "Set game status.");
    } catch (err) {
      logMessage("error", `Status couldn't be set. ${err}`);
    }
  }
}

/**
 * Run through {@link updateActivity}, {@link notifyRestart}, {@link notifyNewErrors}.
 */
export default async function startup(bot: Client, db: ConniebotDatabase) {
  logMessage("info", "Bot ready. Setting up...");
  await Promise.all([updateActivity, notifyRestart, notifyNewErrors].map(fn => fn(bot, db)));
}
