//-----------
//   vars
//-----------

// data files
const settings = require('../settings.json');

//-----------
//  exports
//-----------

exports.embed = function (user) {
    return {
        embed: {
            color: settings.embeds.colors.success,
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