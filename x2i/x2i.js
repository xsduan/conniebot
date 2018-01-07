'use strict';

//-----------
//   vars
//-----------

// data files
const settings = require('../settings.json');

// consts
// regex match indices: 2 = key (to lower), 3 = bracket left, 4 = body, 5 = bracket right, (end)
const regex = /(?:(^|\s))([A-Za-z])([\/\[])(\S.*?\S)([\/\]])/gm;
const matchType = {
    'x': {
        keys: require('./x2i-keys.json'),
        join: function (match) {
            return match.slice(3).join('');
        }
    },
    'z': {
        keys: require('./z2i-keys.json'),
        join: function (match) {
            return match.slice(3).join('');
        }
    },
    'p': {
        keys: require('./apie-keys.json'),
        join: function (match) {
            return '*' + match[4];
        }
    }
}

//-----------
// functions
//-----------

const convert = function (raw, keys) {
    // find & replace, in descending order of substr size
    keys.forEach(function (key) {
        raw = raw.replace(new RegExp(key[0], 'g'), key[1]);
    });
    return raw;
}

//-----------
//  exports
//-----------

exports.grab = function (content) {
    var matches = [], match;
    var length = 0;
    while (length < settings.embeds.timeoutChars && (match = regex.exec(content))) {
        if (match[4] != '') {
            var matchActions = matchType[match[2].toLowerCase()];
            if (matchActions !== undefined) {
                match[4] = convert(match[4], matchActions.keys);
                length += match[4].length;
                matches.push(matchActions.join(match));
            }
        }
    }
    return matches.join('\n');
}
