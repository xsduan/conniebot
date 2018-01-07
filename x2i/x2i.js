'use strict';

//-----------
//   vars
//-----------

// data files
const x2iKeys = require('./x2i-keys.json');
const apieKeys = require('./apie-keys.json');

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

const find = function (message, regex, keys) {
    var matches = '', match;
    while (match = regex.exec(message)) {
        if (match[3] != '') {
            matches += convert(match[3], keys) + '\n';
        }

        if (matches.length > 1024) {
            break;
        }
    }
    return matches;
}

//-----------
//  exports
//-----------

exports.xsampa = function (message) {
    // find all occurences of xsampa using x[]
    // or x// (or x[/ or x/] if you're absolutely crazy)
    return find(message, /(?:(^|\s))(x[\/\[])(\S.*?\S)([\/\]])/gm, x2iKeys);
}

exports.apie = function (message) {
    // find all occurences of p//
    return find(message, /(?:(^|\s))(p\/)(\S.*?\S)(\/)/gm, apieKeys);
}
