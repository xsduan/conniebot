//-----------
//   vars
//-----------

// data files
const x2iKeys = require('./x2i-keys.json');

//-----------
// functions
//-----------

convert = function (xsampa) {
    // find & replace, in descending order of substr size
    x2iKeys.forEach(function (x2iKey) {
        xsampa = xsampa.replace(new RegExp(x2iKey[0], 'g'), x2iKey[1]);
    });

    // reappend x[] and send it off
    return xsampa;
}

//-----------
//  exports
//-----------

exports.grab = function (message) {
    // regexes
    var xsampaRegex = /(?:(^|\s))(x[\/\[])(.*?)([\/\]])/gm;

    // find all occurences of xsampa using x[]
    // or x// (or x[/ or x/] if you're absolutely crazy)
    var matches = [], match;
    while (match = xsampaRegex.exec(message)) {
        if (match[3] != '') {
            matches.push([match[3], convert(match[3])].join(' \u2192 '));
        }
    }

    // TODO: PIE-SAMPA or whatever

    return matches.join('\n');
}
