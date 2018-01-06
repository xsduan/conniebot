//-----------
//   vars
//-----------

// data files
const settings = require('../settings.json');

//-----------
//  exports
//-----------

exports.output = function (message, headersImportant = true) {
    return settings.embeds.active ? message : strip(message, headersImportant);
}

exports.strip = function (message, headersImportant = true) {
    var body = message.embed.fields.forEach(function (field) {
        var fieldString = '';

        if (headersImportant) {
            fieldString += '**' + field.name + '**\n';
        }

        return fieldString + field.value;
    });

    return '**' + message.title + '**\n\n' + body.join('\n\n');
}