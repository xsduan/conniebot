'use strict';

//-----------
//   vars
//-----------

// data files
const settings = require('../settings.json');

//-----------
// functions
//-----------

const handleTitle = function (message) {
    var title = '';
    if (message.embed.title !== undefined) {
        title = '**' + message.embed.title + '**\n\n';
    }
    return title;
}

const handleBody = function(message, headersImportant) {
    var body = '';
    message.embed.fields.forEach(function (field) {
        var fieldString = '';

        if (headersImportant) {
            fieldString += '**' + field.name + '**\n';
        }

        body += fieldString + field.value + '\n';
    });
    return body;
}

//-----------
//  exports
//-----------

exports.output = function (message, headersImportant = true) {
    return settings.embeds.active ? message : exports.strip(message, headersImportant);
}

exports.strip = function (message, headersImportant = true) {
    return handleTitle(message) + handleBody(message, headersImportant);
}
