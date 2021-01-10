import path from "path"
import util from "util"
import fs from "fs"
import yaml from "yaml"
import dotenv from "dotenv"

import { updateOKRecordsToAirtableAll } from "../update-ok-records-to-airtable"

dotenv.config()

const readFile = util.promisify(fs.readFile)

const run = async () => {
  const filename = path.resolve(process.env.PATH_MONGO_AIRTABLE_YAML)
  let config = await readFile(filename, "utf-8")
  config = yaml.parse(config)
  console.log(config)

  updateOKRecordsToAirtableAll(config)
}

run()
