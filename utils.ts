import { Channel, TextChannel } from "discord.js";

export function isTextChannel(channel: Channel): channel is TextChannel {
    return ["dm", "group", "text"].includes(channel.type) && "send" in channel;
}
