const spawn = require('child_process').spawn
const argv = require('minimist')(process.argv)
const c = require('config')

const { data, dist } = {
  data: 'data',
  dist: 'dist',
  ...c.get('dirs')
}

function run(command) {
  console.log('>>', command)
  const [file, ...args] = command.split(' ')
  return new Promise((y, n) => {
    let proc = spawn(file, args)
    proc.stdout.on('data', b => process.stdout.write(`${b}`))
    proc.stderr.on('data', b => process.stderr.write(`${b}`))
    proc.on('close', code => code !== 0
      ? n(new Error(`Command ended with code ${code}`))
      : y()
    )
  })
}

async function build() {
  for (const command of [
    `npx tsc --outDir ${dist}`,
    `mkdir -pv ${data}`,
    `cp -aRv x2i-data/ ${data}/${c.get('x2i')}/`,
  ]) {
    await run(command)
  }
}

function fmtNoInstall(str, noInstall) {
  return str + (noInstall ? ' --no-install': '')
}

async function start() {
  const start = argv.s || argv.start
  const forever = argv.f || argv.forever
  const noInstall = argv['no-install']

  if (start && forever) {
    throw new Error('Simultaneous start and forever. Pick one!!')
  } else if (!start && !forever) {
    return
  } else if (start) {
    return run(fmtNoInstall(
      `npx nodemon --watch ${dist} --watch ${data} -x node ${dist}`, noInstall))
  } else if (forever) {
    const name = argv.n || argv.name || 'conniebot'
    return run(fmtNoInstall(`npx pm2 start ${dist} -n ${name}`, noInstall))
  }
}

(async () => {
  if (argv.h || argv.help) {
    return console.log(`
usage: node build [-hsfn] [--no-install]

conniebot build script.

-h, --help      print out this message and quit.
-s, --start     watch files for development using nodemon.
-f, --forever   run conniebot in production using pm2 (open source version).
-n, --name      process name if running in forever mode. (default: conniebot)
--no-install    pass \`--no-install\` to npx, so you don't waste time installing
                nodemon or pm2.
    `.trim())
  }

  await build()
  await start()
})()
