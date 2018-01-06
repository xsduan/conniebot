exports.embed = function (color, user) {
    return {
        embed: {
            color: color,
            author: {
                name: user.username,
                icon_url: user.avatarURL
            },
            title: "Commands",
            fields: [
                {
                    name: "x[narrow] or x/broad/",
                    value: "Converts XSAMPA to IPA. Hopefully."
                },
                {
                    name: settings.prefix + "help",
                    value: "Reply with this box."
                }
            ]
        }
    }
}