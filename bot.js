//-----------
//   vars
//-----------

// libraries
const Discord = require('discord.js');

// local modules
const x2i = require('./x2i/x2i.js');

// data files
const auth = require('./auth.json');
const settings = require('./settings.json');

// lifetime objects
const bot = new Discord.Client();
const guild = new Discord.Guild();

//-----------
// functions
//-----------

printMessage = function (message, status) {
    // truncate message contents
    var content = message.content;
    if (content.length > 100) {
        content = content.substr(0, 100) + '...\n--------';
    }

    console.log('(' + status + ') ' + message.author.username + message.author + ': ' + content);
}

parse = function (message) {
    // TODO: make into separate module
    var command, prefixRegex = new RegExp('(?:^' + settings.prefix + ')(\\w*)');
    if (command = message.content.match(prefixRegex)) {
        command = command[1];
        tokens = message.content.split(" ");

        if (command === 'help') {
            message.channel.send({
                embed: {
                    color: settings.embeds.colors.help,
                    author: {
                        name: bot.user.username,
                        icon_url: bot.user.avatarURL
                    },
                    title: "Commands",
                    fields: [
                        {
                            name: "x[narrow] or x/broad/",
                            value: "Converts XSAMPA to IPA. Hopefully."
                        },
                        {
                            name: settings.prefix + "help",
                            value: "Reply with this box."
                        }
                    ]
                }
            })
        }

        return 'command/' + command;
    }

    var matches = x2i.grab(message.content);
    if (matches.length != 0) {
        var index = 0;
        for (var i = 0; i < settings.embeds.timeoutAfterBatches; i++) {
            // check if finished
            if (index > matches.length) {
                return 'x2i/all';
            }

            after = index + settings.embeds.batchSize;

            message.channel.send({
                embed: {
                    color: settings.embeds.colors.success,
                    fields: [{
                        name: '',
                        value: matches.slice(index, after).join('\n')
                    }]
                }
            });

            index = after;
        }

        message.channel.send({
            embed: {
                color: settings.embeds.colors.warning,
                fields: [{ name: "Timeout", value: settings.embeds.timeoutMessage }]
            }
        });

        return 'x2i/partial';
    }

    return 'none';
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
        result = parse(message);
        printMessage(message, 'processed:' + result);
    } else {
        printMessage(message, 'ignored:bot');
    }
});

bot.login(auth.token);