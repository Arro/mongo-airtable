import fs from 'fs'
import path from 'path'
import moment from 'moment'

import { lookForChangesTable } from './mongodb'
import { seeWhatChangedInAirtable } from './see-what-changed-in-airtable'
import { checkForConflicts } from './check-for-conflicts'
import { updateOKRecordsToMongo } from './update-ok-records-to-mongo'
import { pushChangedTable } from './airtable'

const { readFile, writeFile } = fs.promises

export async function seeWhatChanged(config) {
  const auth_key  = config.auth.airtable

  const last_pulled_filename = path.resolve(`${__dirname}/../build/last-pulled.txt`)
  let last_pulled = await readFile(last_pulled_filename, 'utf-8')

  for (const table of config.sync) {
    await lookForChangesTable(table)
    await seeWhatChangedInAirtable({ auth_key, table, last_pulled })
    await checkForConflicts({ table })
    await updateOKRecordsToMongo({ table })
    await pushChangedTable({ ...table, auth_key})
  }

  await writeFile(last_pulled_filename, moment().format('ddd MMM D YYYY h:mm A ZZ'), 'utf-8')
}



