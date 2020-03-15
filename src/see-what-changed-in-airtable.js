import fs from 'fs'
import path from 'path'
import _ from 'lodash'
import airtableJson from 'airtable-json'
import deepEqual from 'deep-equal'

const { readFile, writeFile } = fs.promises

export async function seeWhatChangedInAirtable({ auth_key, table, last_pulled }) {
  const { base_name, primary, view, populate, database } = table
  
  const filter =
    "DATETIME_DIFF(LAST_MODIFIED_TIME(), " +
    `DATETIME_PARSE('${last_pulled}', 'ddd MMM D YYYY h:mm A ZZ'),`  +
    "'seconds') > 0"

  let airtable_records = await airtableJson({
    auth_key,
    base_name,
    primary,
    view,
    populate,
    filter
  })
 
  const originals_filename = path.resolve(`${__dirname}/../build/${database}/${primary}.json`)
  let originals = await readFile(originals_filename, `utf-8`)
  originals = JSON.parse(originals)


  let recent = []
  let modified = []

  for (const airtable_record of airtable_records) {
    const original_record = _.find(originals, (o) => {
      return o.__id === airtable_record.__id
    })

    if (!original_record) {
      recent.push({
        ...airtable_record
      })
      continue
    }

    let modified_fields = {}
    for (const field in airtable_record) {
      if (deepEqual(airtable_record[field], original_record[field])) continue
      modified_fields[field] = airtable_record[field]
    }

    for (const field in original_record) {
      if (airtable_record[field] === undefined) {
        modified_fields[field] = null
      }
    }

    modified.push({
      __id: airtable_record.__id,
      ...modified_fields
    })
  }

  const json_string = JSON.stringify({ recent, modified }, null, 2)
  const json_filename = path.resolve(`${__dirname}/../build/${database}/${primary}_changed_in_airtable.json`)
  await writeFile(json_filename, json_string, `utf-8`)

}
