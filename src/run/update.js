import path from 'path'
import util from 'util'
import fs from 'fs'
import yaml from 'yaml'

import { seeWhatChanged } from '../merge'
import dotenv from 'dotenv'

dotenv.config()

const readFile = util.promisify(fs.readFile)

const run = async() => {
  const filename = path.resolve(process.env.PATH_MONGO_AIRTABLE_YAML)
  let config = await readFile(filename, 'utf-8')
  config  = yaml.parse(config)

  await seeWhatChanged(config)
}

run()

