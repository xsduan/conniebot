import { spawn } from 'child_process'
import minimist from 'minimist'
import c from 'config'

const argv = minimist(process.argv)

const { data, dist } = {
  data: 'data',
  dist: 'dist',
  ...c.get('dirs')
}

function getSpawnArgs (command) {
  console.log('>>', command)
  const [file, ...args] = command.split(' ')
  return [file, args]
}

function run (command) {
  return new Promise((resolve, reject) => {
    const [f, a] = getSpawnArgs(command)
    const proc = spawn(f, a, { stdio: 'inherit', shell: true })
    proc.on('close', code => code !== 0
      ? reject(new Error(`Command ended with code ${code}`))
      : resolve()
    )
  })
}

async function build () {
  const x2iDir = `${data}/${c.get('x2i')}`
  for (const command of [
    `npx tsc --outDir ${dist}`,
    `[ -d ${data} ] || mkdir ${data}`,
    `rm -rf ${x2iDir}`,
    `cp -aRv x2i-data ${x2iDir}`
  ]) {
    await run(command)
  }
}

function fmtNoInstall (str, noInstall) {
  return str + (noInstall ? ' --no' : '')
}

async function start () {
  const start = argv.s || argv.start
  const forever = argv.f || argv.forever
  const noInstall = argv['no-install']

  if (start && forever) {
    throw new Error('Simultaneous start and forever. Pick one!!')
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
--no-install    pass \`--no\` to npx, so you don't waste time installing nodemon
                or pm2.
    `.trim())
  }

  await build()
  await start()
})()
