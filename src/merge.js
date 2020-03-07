import fs from 'fs'
import path from 'path'
import moment from 'moment'
import airtableJson from 'airtable-json'

const { readFile, writeFile } = fs.promises

export async function seeWhatChanged(config) {
  const auth_key  = config.auth.airtable

  const last_pulled_filename = path.resolve(`${__dirname}/../build/last-pulled.txt`)
  let last_pulled = await readFile(last_pulled_filename, 'utf-8')
  last_pulled = moment(parseInt(last_pulled))

  for (const table of config.sync.slice(0, 1)) {
    await seeWhatChangedInAirtable({ auth_key, table, last_pulled })
  }
}


async function seeWhatChangedInAirtable({ auth_key, table, last_pulled }) {
  const { base_name, primary, view, populate, database } = table
  console.log(table)
  console.log(last_pulled.format(`ddd MMM D YYYY h:mm A`))
  // get all recent from airtable
  
  const filter =
    "DATETIME_DIFF(LAST_MODIFIED_TIME(), " +
    `DATETIME_PARSE('${last_pulled.format('ddd MMM D YYYY h:mm A')}', 'ddd MMM D YYYY h:mm A'),`  +
    "'seconds') > 0"

  let records = await airtableJson({
    auth_key,
    base_name,
    primary,
    view,
    populate,
    filter
  })
 
  console.log(records)

  const json_string = JSON.stringify(records, null, 2)
  const json_filename = path.resolve(`${__dirname}/../build/${database}/${primary}_changed_in_airtable.json`)
  await writeFile(json_filename, json_string, `utf-8`)
}

