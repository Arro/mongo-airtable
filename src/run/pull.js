import fs from "fs-extra"
import moment from "moment"
import path from "path"

import pullTable from "../pull-table-from-airtable"
import insertIntoMongo from "../insert-into-mongo"
import validateEnv from "../validate-env"
;(async function () {
  validateEnv()

  for (const table_to_sync of process.env.yaml_config.sync) {
    await pullTable({
      ...table_to_sync,
      auth_key: process.env.airtable_key
    })
  }

  const last_pulled_filename = path.join(
    process.env.local_save_path,
    `last-pulled.txt`
  )

  const tables = process.env.yaml_config.sync
  for (const { primary, collection, database } of tables) {
    await insertIntoMongo({
      primary,
      collection,
      database
    })
  }

  await fs.writeFile(
    last_pulled_filename,
    moment().format("ddd MMM D YYYY h:mm A ZZ"),
    "utf-8"
  )
})()
