# conniebot

really cool language bot (rip miss connie sr)

## what do

it does various cool language things. currently it has these features:

- xsampa to ipa (try it out in chat with `x[Eks "s{mp_h@ tu aI_^pi:Ei_^]`)
- oh wow this is a pathetic features list

hopefully it does more in future, such as:

- apie and zsampa
- play phonemes in chat
- spectrogram/vowel analyzer in chat

don't count on it tho

### but y

rest in pisces connie the bot (201x - 2017)

## how 2 setup

### pre flight checklist

#### on the discord website

- set up [an application](https://github.com/reactiflux/discord-irc/wiki/Creating-a-discord-bot-&-getting-a-token) and all that stuff
- set up [oauth](https://discordapp.com/developers/tools/oauth2-url-generator) or let it run loose (whatever your wallet can afford)

#### here in ground control

- download and install [node.js and npm](https://nodejs.org/) if you haven't already (duh)
- set up `auth.json` using your bot token (an example with blank credentials can be found in `auth-example.json`)
- maybe look at `settings.json`?

### deployment

- run `npm install`
- run `node bot`
- pray to whatever god that it doesn't nuke your computer

## contributing

currently using [vscode](https://code.visualstudio.com/)<sup>[repo](https://github.com/Microsoft/vscode)</sup> and as such using its default js autoformatting tools. I believe it's pretty standard so if you know that another editor uses the same standard then go wild.

as a minimum, please don't use too many blank lines or tabs, and keep all variable names sane. don't use anything unreadably terse or minified (whether formatting or code itself) but don't make it super long and boring. I'm not really serious about this project so I won't be too strict about this type of stuff but pls try.

### issues & pull requests

when opening issues please state which module or file this concerns (separating multiple by commas only if it makes sense). `*.js` or `*` is assumed if there's no file extension so please leave js files extensionless.

please only work on one module at a time for pull requests if you can.

thank you for contributing!
