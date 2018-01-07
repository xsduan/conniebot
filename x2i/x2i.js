'use strict';

//-----------
//   vars
//-----------

// data files
const x2iKeys = require('./x2i-keys.json');

//-----------
// functions
//-----------

const convert = function (xsampa) {
    // find & replace, in descending order of substr size
    x2iKeys.forEach(function (x2iKey) {
        xsampa = xsampa.replace(new RegExp(x2iKey[0], 'g'), x2iKey[1]);
    });
    return xsampa;
}

//-----------
//  exports
//-----------

exports.xsampa = function (message) {
    // regexes
    const xsampaRegex = /(?:(^|\s))(x[\/\[])(\S.*?\S)([\/\]])/gm;

    // find all occurences of xsampa using x[]
    // or x// (or x[/ or x/] if you're absolutely crazy)
    var matches = '', match;
    while (match = xsampaRegex.exec(message)) {
        if (match[3] != '') {
            matches += convert(match[3]) + '\n';
        }

        if (matches.length > 1024) {
            break;
        }
    }

    // TODO: PIE-SAMPA or whatever

    return matches;
}
