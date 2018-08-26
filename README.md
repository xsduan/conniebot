# conniebot

really cool language bot

## what do

it does various cool language things. currently:

- xsampa & zsampa to ipa (try it out with `x[Eks "s{mp_h@ tu aI_^pi:Ei_^]`)
- fun ascii pie notation (try it out with `p/g'hm"o:/`)

## setup

### pre flight checklist

#### on the discord website

- do the [application setup] and all that stuff
- set up [oauth] or let it run loose (whatever your wallet can afford)

#### here in ground control

- download and install [node] if you haven't already (duh)
- set up `default.yaml` using your bot token ([example config])
- maybe look at the other settings?

### deployment

- run `npm install` (`npm install --production` or `npm ci --only=production`
  if you're not planning on doing any code changes)
- run `npm start` (or `npm run forever` if you want to run it in the background)
- pray to whatever god that it doesn't nuke your computer

### have a comment?

join me on discord: https://discord.gg/MvWMH3z

[application setup]: https://github.com/reactiflux/discord-irc/wiki/Creating-a-discord-bot-&-getting-a-token
[oauth]: https://discordapp.com/developers/tools/oauth2-url-generator
[node]: https://nodejs.org/
[example config]: ./config/default-example.yaml
