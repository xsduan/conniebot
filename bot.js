'use strict';

//-----------
//   vars
//-----------

// libraries
const Discord = require('discord.js');

// local modules
const embed = require('./embed/embed.js');
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

const logMessage = function (status, message = null) {
    var log = '(' + status + ')';

    if (message != null) {
        log += ' ' + message;
    }

    console.log(log);
}

const parse = function (message) {
    // commands
    const prefixRegex = new RegExp('(?:^' + settings.prefix + ')(\\S*)');
    var command;
    if (command = message.content.match(prefixRegex)) {
        command = command[1];
        var tokens = message.content.split(' ');

        if (command === 'help') {
            message.channel.send(embed.output(help.embed(bot.user)))
                .then(() => logMessage('success:command/help'))
                .catch(err => logMessage('error:command/help', err));
        } else if (command === 'ping') {
            const elapsed = new Date().getTime() - message.createdTimestamp;
            message.channel.send('I\'m alive! (' + elapsed + ' ms)')
                .then(() => logMessage('success:command/ping/' + elapsed + 'ms'))
                .catch(err => logMessage('error:command/ping', err));
        }

        logMessage('ignored:command/' + command);
    }

    // x2i
    var matches = x2i.grab(message.content);
    if (matches.length !== 0) {
        // shorten field to 1024
        if (matches.length > 1024) {
            matches = matches.slice(0, 1023) + '…';
            message.channel.send(embed.output({
                embed: {
                    color: settings.embeds.colors.warning,
                    fields: [{ name: 'Timeout', value: settings.embeds.timeoutMessage }]
                }
            })).then(() => logMessage('timeout:x2i/partial', message))
                .catch(err => logMessage('error:timeout:x2i/partial', err));
        }

        message.channel.send(embed.output({
            embed: {
                color: settings.embeds.colors.success,
                fields: [{
                    name: 'X-SAMPA found:',
                    value: matches
                }]
            }
        }, false)).then(() => logMessage('success:x2i/all'))
            .catch(err => err => logMessage('error:x2i/partial', err));
    }

    logMessage('-processed-');
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
