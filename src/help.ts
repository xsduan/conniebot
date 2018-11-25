import c from "config";
import { Channel, RichEmbed, User } from "discord.js";

import embed from "./embed";
import { isTextChannel } from "./helper/utils";

const helpMessage: [string, string][] = [
  ["x,z,p[phonetic] or x,z,p/phonemic/",
    "Converts XSAMPA, ZSAMPA, or APIE. Hopefully."],
  [`${c.get("prefix")}help`,
    "Reply with this message."],
  ["About these conversions", `<https://en.wikipedia.org/wiki/X-SAMPA>
<http://www.kneequickie.com/kq/Z-SAMPA>`],
  ["\u200B",
    `found a bug or want to suggest a feature?
github: <https://github.com/xsduan/conniebot>
come discuss: https://discord.gg/MvWMH3z`],
];

/**
 * Return Help message, nicely formatted.
 *
 * @param user User to put as head
 */
function createEmbed(user: User) {
  const helpEmbed = new RichEmbed()
    .setColor(c.get("embeds.colors.success"))
    .setAuthor(user.username, user.avatarURL)
    .setTitle("Commands");

  for (const entry of helpMessage) {
    helpEmbed.addField(...entry);
  }

  return helpEmbed;
}

/*
 * exports
 */

/**
 * Sends a help message.
 *
 * @param channel Channel to send to
 * @param user User to put as head
 */
export default async function help(channel: Channel, user: User) {
  if (!isTextChannel(channel)) {
    throw new TypeError(`${channel} is not a text channel`);
  }
  return embed(channel, createEmbed(user));
}
