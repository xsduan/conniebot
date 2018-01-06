//-----------
//   vars
//-----------

// libraries
const Discord = require('discord.js');

// local modules
const x2i = require('./x2i/x2i.js');
const help = require('./help/help.js');

// data files
const auth = require('./auth.json');
const settings = require('./settings.json');

// lifetime objects
const bot = new Discord.Client();
const guild = new Discord.Guild();

//-----------
// functions
//-----------

logMessage = function (status, message = null) {
    log = '(' + status + ')';

    if (message != null) {
        log += ' ' + message;
    }

    console.log(log);
}

parse = function (message) {
    // TODO: make into separate module
    var command, prefixRegex = new RegExp('(?:^' + settings.prefix + ')(\\w*)');
    if (command = message.content.match(prefixRegex)) {
        command = command[1];
        tokens = message.content.split(" ");

        if (command === 'help') {
            message.channel.send(help.embed(settings.embeds.colors.success, bot.user))
                .then(() => logMessage('success:command/help'))
                .catch(err => logMessage('error:command/help', message));
        }

        logMessage('ignored:command/' + command);
    }

    var matches = x2i.grab(message.content);
    if (matches.length != 0) {
        // shorten field to 1024
        if (matches.length > 1024) {
            matches = matches.slice(0, 1023) + '…';
            message.channel.send({
                embed: {
                    color: settings.embeds.colors.warning,
                    fields: [{ name: "Timeout", value: settings.embeds.timeoutMessage }]
                }
            }).then(() => logMessage('timeout:x2i/partial', message))
                .catch(err => logMessage('error:timeout:x2i/partial', err));
        }

        message.channel.send({
            embed: {
                color: settings.embeds.colors.success,
                fields: [{
                    name: '\u200b',
                    value: matches
                }]
            }
        }).then(() => logMessage('success:x2i/all'))
            .catch(err => err => logMessage('error:x2i/partial', err));
    }

    logMessage('none');
}

//-----------
//   main
//-----------

bot.on('ready', () => {
    console.log('Bot ready. Setting up...');

    console.log('Changing game status...');
    bot.user.setGame(settings.activeMessage)
        .then(() => console.log('Set game status.'))
        .catch(function (error) {
            console.log('Game couldn\'t be set.');
        });
});

bot.on('message', message => {
    if (!message.author.bot) {
        parse(message);
    } else {
        logMessage('ignored:bot');
    }
});

bot.login(auth.token);