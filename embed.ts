import c from "config";
import { RichEmbed } from "discord.js";

/**
 * Grabs body from RichEmbed, optionally discarding headers
 *
 * @param message Message to grab body text from
 * @param headersImportant Should keep headers?
 * @returns Body of RichEmbed
 */
function handleBody(message: RichEmbed, headersImportant = false) {
  return (message.fields || []).map(field => {
    const fieldString = headersImportant ? `**${field.name}**\n` : "";
    return `${fieldString}${field.value}`;
  }).join('\n');
}

/**
 * Convert RichEmbed to String
 *
 * @param message Message to grab body text from
 * @param headersImportant Should keep headers?
 * @returns String representation of RichEmbed
 */
function strip(message: RichEmbed, headersImportant = false) {
  const title = message.title ? `**${message.title}**\n` : "";
  const desc = message.description ? `${message.description}\n` : "";
  const body = handleBody(message, headersImportant);

  return `${title}${desc}\n${body}`;
}

/*
 * exports
 */

/**
 * Send message to channel
 *
 * @param channel Channel to send message to
 * @param message Message to send
 * @param headersImportant Should keep headers if converted?
 */
export default function embed(
  channel: any,
  message: RichEmbed | string,
  headersImportant = true,
) {
  return channel.send(c.get("embeds.active") || typeof message === "string"
    ? message
    : strip(message, headersImportant));
}
