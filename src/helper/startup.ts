import { Client } from "discord.js";

import ConniebotDatabase from "./db-management.js";
import { log, sendMessage } from "./utils/index.js";

/**
 * Send notification to channel for reboot.
 */
export async function notifyRestart(bot: Client, db: ConniebotDatabase) {
  const channelId = await db.getChannel("restart");
  if (!channelId) {
    return log("warn", "Couldn't find channel to notify.");
  }

  const channel = await bot.channels.fetch(channelId);
  if (!channel?.isSendable()) {
    return log("warn", `Channel ${channelId} doesn't exist or is not a text channel.`);
  }

  try {
    const timestamp = Math.round(Date.now() / 1000);
    await channel.send(`Rebooted at <t:${timestamp}:D> <t:${timestamp}:T>.`);
    // @ts-expect-error There's a reason the `||` is there.
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

  const errorChannel = await bot.channels.fetch(errorChannelId);
  if (!errorChannel?.isSendable()) {
    return log("warn", "Can't use listed error channel. (nonexistent or not text)");
  }

  await sendMessage(`Found ${errors.length} errors on startup.`, errorChannel);

  const promises = errors.map(async ({ id, date, stacktrace, message }) => {
    const errorMessage = `at ${new Date(date)}:\n\`\`\`${stacktrace || message}\`\`\``;
    if (await sendMessage(errorMessage, errorChannel)) {
      await db.moveError(id);
    }
  });
  await Promise.all(promises);
}

/**
 * Update activity of bot.
 */
export function updateActivity(bot: Client, activeMessage: string | undefined) {
  log("info", "Changing game status: \x1b[95m%s\x1b[0m...", activeMessage);
  try {
    // This is type-safe, but TypeScript can't prove it due to https://github.com/microsoft/TypeScript/issues/14107
    bot?.user?.setActivity(activeMessage as any);
    log("info", "Set game status.");
  } catch (err) {
    log("error", `Status couldn't be set. ${err}`);
  }
}
