import { Client } from "discord.js";

import ConniebotDatabase from "./db-management";
import { isTextChannel, log, sendMessage } from "./utils";

/**
 * Send notification to channel for reboot.
 */
export async function notifyRestart(bot: Client, db: ConniebotDatabase) {
  const channelId = await db.getChannel("restart");
  if (!channelId) {
    return log("warn", "Couldn't find channel to notify.");
  }

  const channel = bot.channels.get(channelId);
  if (!channel || !isTextChannel(channel)) {
    return log("warn", `Channel ${channelId} doesn't exist or is not a text channel.`);
  }

  try {
    await channel.send(`Rebooted at ${new Date()}.`);
    log("info", `Notified ${channel} (#${channel.name || "??"}) of restart.`);
  } catch (err) {
    log("error", err);
  }
}

/**
 * Notify channel of any new errors that haven't been able to send.
 */
export async function notifyNewErrors(bot: Client, db: ConniebotDatabase) {
  const [errors, errorChannelId] = await Promise.all(
    [db.getUnsentErrors(), db.getChannel("errors")],
  );

  if (!errors.length) return;
  if (!errorChannelId) {
    return log("warn", "Couldn't find error channel.");
  }

  const errorChannel = bot.channels.get(errorChannelId);
  if (!errorChannel || !isTextChannel(errorChannel)) {
    return log("warn", "Can't use listed error channel. (nonexistent or not text)");
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
export async function updateActivity(bot: Client, activeMessage: string) {
  log("info", "Changing game status: \x1b[95m%s\x1b[0m...", activeMessage);
  try {
    await bot.user.setActivity(activeMessage);
    log("info", "Set game status.");
  } catch (err) {
    log("error", `Status couldn't be set. ${err}`);
  }
}
