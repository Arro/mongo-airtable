import fs from "fs-extra"
import path from "path"
import moment from "moment"

import resetJsonFiles from "./reset-json-files"
import lookForChangesInMongo from "./look-for-changes-in-mongo"
import seeWhatChangedInAirtable from "./see-what-changed-in-airtable"
import checkForConflicts from "./check-for-conflicts"
import updateOKRecordsToMongo from "./update-ok-records-to-mongo"
import updateOKRecordsToAirtable from "./update-ok-records-to-airtable"

export async function seeWhatChanged(config) {
  const local_save_path = path.resolve(process.env.local_save_path)
  const auth_key = config.auth.airtable

  const last_pulled_filename = path.join(local_save_path, `last-pulled.txt`)
  let last_pulled = await fs.readFile(last_pulled_filename, "utf-8")

  console.log("Syncing local mongo with remote airtable")
  console.log("========================================\n")
  console.log(
    `starting update at ${moment().format(
      "ddd MMM D YYYY"
    )} at ${moment().format("h:mm A")}\n`
  )

  for (const table of config.sync) {
    console.log(`--------------------------\n`)
    console.log(`-> table: ${table.primary}`)
    await resetJsonFiles(table)
    await lookForChangesInMongo(table)
    await seeWhatChangedInAirtable({ auth_key, table, last_pulled })
    await checkForConflicts({ table })
    await updateOKRecordsToMongo({ table })
    await updateOKRecordsToAirtable({ ...table, auth_key })
    console.log(`\n-> completed table: ${table.primary}\n`)
  }

  console.log(
    `completed update at ${moment().format(
      "ddd MMM D YYYY"
    )} at ${moment().format("h:mm A")}\n`
  )

  await fs.writeFile(
    last_pulled_filename,
    moment().format("ddd MMM D YYYY h:mm A ZZ"),
    "utf-8"
  )
}
