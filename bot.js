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
    command(message);
    x2iExec(message);
}

const command = function (message) {
    // commands
    const prefixRegex = new RegExp('(?:^' + settings.prefix + ')(\\S*)');
    var command;
    if (command = message.content.match(prefixRegex)) {
        command = command[1];
        var tokens = message.content.split(' ');

        switch (command) {
            // ping command is special case response.
            case 'ping':
                ping(message);
                break;
            case 'help':
                help.help(message.channel, bot.user)
                    .then(() => logMessage('success:command/help'))
                    .catch(err => logMessage('error:command/help', err));
        }

        logMessage('processed:command/' + command);
    }
}

const ping = function (message) {
    const elapsed = new Date().getTime() - message.createdTimestamp;
    message.channel.send('I\'m alive! (' + elapsed + ' ms)')
        .then(() => logMessage('success:command/ping/' + elapsed + 'ms'))
        .catch(err => logMessage('error:command/ping', err));
}

const x2iExec = function (message) {
    var xsampa = x2i.xsampa(message.content);
    var apie = x2i.apie(message.content);
    if (xsampa.length !== 0 || apie.length !== 0) {
        // shorten fields to limit
        if (xsampa.length > settings.embeds.timeoutChars
            || apie.length > settings.embeds.timeoutChars) {
            xsampa = xsampa.slice(0, settings.embeds.timeoutChars - 1) + '…';
            apie = apie.slice(0, settings.embeds.timeoutChars - 1) + '…';

            help.timeout(message.channel)
                .then(() => logMessage('timeout:x2i/partial', message))
                .catch(err => logMessage('error:timeout:x2i/partial', err));
        }

        if (xsampa.length !== 0) {
            message.channel.send(embed.output({
                embed: {
                    color: settings.embeds.colors.success,
                    description: xsampa
                }
            })).then(() => logMessage('success:x2i/xsampa'))
                .catch(err => logMessage('error:x2i/xsampa', err));
        }

        if (apie.length !== 0) {
            message.channel.send(embed.output({
                embed: {
                    color: settings.embeds.colors.success,
                    description: apie
                }
            })).then(() => logMessage('success:x2i/apie'))
                .catch(err => logMessage('error:x2i/apie', err));
        }

        logMessage('processed:x2i');
    }
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
    logMessage('-start ' + message.createdTimestamp + '-')
    if (!message.author.bot) {
        parse(message);
    } else {
        logMessage('ignored:bot');
    }

    logMessage('-processed ' + message.createdTimestamp + '-');

    // separate message return statuses in logs
    console.log();
});

bot.login(auth.token);
