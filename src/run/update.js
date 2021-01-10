import path from "path"
import util from "util"
import fs from "fs"
import dotenv from "dotenv"

import { seeWhatChanged } from "../merge"

dotenv.config()

const readFile = util.promisify(fs.readFile)

const run = async () => {
  const filename = path.resolve(process.env.PATH_MONGO_AIRTABLE_YAML)
  let config = await readFile(filename, "utf-8")
  await seeWhatChanged(config)
}

run()
