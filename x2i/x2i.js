'use strict';

//-----------
//   vars
//-----------

// data files
const settings = require('../settings.json');
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

const find = function (message, regex, keys, bodyIndex = 3) {
    var matches = [], match;
    var length = 0;
    while (length < settings.embeds.timeoutChars && (match = regex.exec(message))) {
        if (match[bodyIndex] != '') {
            match[bodyIndex] = convert(match[bodyIndex], keys);
            length += match[bodyIndex].length;
            matches.push(match);
        }
    }
    return matches;
}

//-----------
//  exports
//-----------

exports.xsampa = function (message) {
    var result = '';
    // find all occurences of xsampa using x[]
    // or x// (or x[/ or x/] if you're absolutely crazy)
    var matches = find(message, /(?:(^|\s)x)([\/\[])(\S.*?\S)([\/\]])/gm, x2iKeys);
    matches.forEach(function (match) {
        result += match.slice(2).join('') + '\n';
    })
    return result;
}

exports.apie = function (message) {
    var result = '';
    // find all occurences of p//
    var matches = find(message, /(?:(^|\s)p)(\/)(\S.*?\S)(\/)/gm, apieKeys);
    matches.forEach(function (match) {
        result += '*' + match[3] + '\n';
    });
    return result;
}
