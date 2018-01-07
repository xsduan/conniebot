'use strict';

//-----------
//   vars
//-----------

// data files
const settings = require('../settings.json');

const help = [
    {
        name: 'x[phonetic] or x/phonemic/',
        value: 'Converts XSAMPA to IPA. Hopefully.'
    },
    {
        name: settings.prefix + 'help',
        value: 'Reply with this box.'
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