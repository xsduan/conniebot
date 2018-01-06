//-----------
//   vars
//-----------

// data files
const settings = require('../settings.json');

//-----------
// functions
//-----------

handleTitle = function (message) {
    var title = '';
    if (message.embed.title !== undefined) {
        title = '**' + message.embed.title + '**\n\n';
    }
    return title;
}

handleBody = function(message, headersImportant) {
    var body = '';
    message.embed.fields.forEach(function (field) {
        var fieldString = '';

        if (headersImportant) {
            fieldString += '**' + field.name + '**\n';
        }

        body += fieldString + field.value + '\n\n';
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
