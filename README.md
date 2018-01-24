# conniebot

really cool language bot (rip miss connie sr)

## what do

it does various cool language things. currently:

- xsampa & zsampa to ipa (try it out with `x[Eks "s{mp_h@ tu aI_^pi:Ei_^]`)
- apie to pie notation (try it out with `p/g'hm"o:/`)

hopefully it does more in future relating to audio like

- playing phonemes in chat
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
- set up `default.hjson` using your bot token (an example can be found in `default-example.hjson`)
 - [hjson tutorial](http://hjson.org/) – different from json but makes writing these things a lot easier
- maybe look at the other settings?

### deployment

- run `npm install` (`npm install --production` if you're not planning on doing any code changes)
- run `node bot`
- pray to whatever god that it doesn't nuke your computer

## contributing

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

I use standard js as a linter (finally, huh?). just run `npm run lint` before committing (and if you don't, I'll run it before merging anyways). I'm not too attached to any standard specifically so if you can come up with a good reason to switch to another style then I'll consider it.

as a minimum, please don't use too many blank lines or tabs, and keep all variable names sane. don't use anything unreadably terse or minified (whether formatting or code itself) but don't make it more verbose than it has to be. I'm not really serious about this project so as long as it passes the standard js linter and isn't too weird I'll let it pass.

### issues & pull requests

when opening issues please state which module or file this concerns (separating multiple by commas only if it makes sense). `*.js` or `*` is assumed if there's no file extension so please leave js files extensionless.

please only work on one module at a time for pull requests if you can.

thank you for contributing!

### have a comment?

join me on discord: https://discord.gg/MvWMH3z
