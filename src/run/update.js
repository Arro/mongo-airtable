import path from 'path'
import util from 'util'
import fs from 'fs'
import yaml from 'yaml'

import { seeWhatChanged } from '../merge'

const readFile = util.promisify(fs.readFile)

const run = async() => {
  const filename = path.resolve(`${process.env.HOME}/.mongo-airtable.yaml`)
  let config = await readFile(filename, 'utf-8')
  config  = yaml.parse(config)

  await seeWhatChanged(config)
}

run()

