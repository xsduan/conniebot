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

printMessage = function(message, status) {
    // truncate message contents
    var content = message.content;
    if (content.length > 100) {
        content = content.substr(0, 100) + '...\n--------';
    }

    console.log('(' + status + ') ' + message.author.username + message.author + ': ' + content);
}

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
        var matches = x2i.grab(message.content);
        if (matches.length != 0) {
            message.channel.send(matches);
        }
        printMessage(message, 'processed');
    } else {
        printMessage(message, 'ignored/bot');
    }
});

bot.login(auth.token);