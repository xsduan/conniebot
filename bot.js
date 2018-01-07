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
            // all the following commands are handled the same.
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
    var results = x2i.grab(message.content);

    if (results.length !== 0) {
        var response = {
            color: settings.embeds.colors.success
        };
        var logCode = 'all';

        // check timeout
        var timedOut = results.length > settings.embeds.timeoutChars;
        if (timedOut) {
            response.fields = [{ name: 'Timeout', value: settings.embeds.timeoutMessage }]
            results = results.slice(0, settings.embeds.timeoutChars - 1) + '…';
            
            logCode = 'partial';
            response.color = settings.embeds.colors.warning;
        }

        response.description = results;

        message.channel.send(embed.output({ embed: response }))
            .then(() => logMessage('success:x2i/' + logCode))
            .catch(err => logMessage('error:x2i/' + logCode, err));

        logMessage('processed:x2i');
    } else {
        logMessage('ignored:x2i');
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
