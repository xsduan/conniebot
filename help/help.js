'use strict';

//-----------
//   vars
//-----------

// local modules
const embed = require('../embed/embed.js');

// data files
const settings = require('../settings.json');

const help = [
    {
        name: 'x[phonetic] or x/phonemic/',
        value: 'Converts XSAMPA to IPA. Hopefully.'
    },
    {
        name: settings.prefix + 'help',
        value: 'Reply with this message.'
    },
    {
        name: '\u200B',
        value: 'found a bug or want to suggest a feature? github: https://github.com/xsduan/conniebot'
    }
]

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
            title: 'Commands',
            fields: help
        }
    };
}

exports.timeout = function(channel) {
    return channel.send(embed.output({
        embed: {
            color: settings.embeds.colors.warning,
            fields: [{ name: 'Timeout', value: settings.embeds.timeoutMessage }]
        }
    }));
}

exports.help = function (channel, user) {
    return channel.send(embed.output(help.embed(user)))
}
