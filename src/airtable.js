import path from 'path'
import airtableJson from 'airtable-json'
import moment from 'moment'

import fs from 'fs'
import mkdirp from 'mkdirp'

const { writeFile } = fs.promises

export async function pullTable({ auth_key,  base_name, primary, view, database, filter, populate=[], flatten=[] }) {
  console.log(`starting sync of ${primary}`)

  let records = await airtableJson({
    auth_key,
    base_name,
    primary,
    view,
    filter,
    populate
  })

  records = records.map((record) => {
    flatten.forEach((f) => {
      record[f] = record[f][0]
    })
    return record
  })

  const json_dirname = path.resolve(`${__dirname}/../build/${database}`)
  await mkdirp(json_dirname)

  const json_filename = path.resolve(`${json_dirname}/${primary}.json`)
  const records_as_json_string = JSON.stringify(records, null, 2)
  await writeFile(json_filename, records_as_json_string, `utf-8`)

  for (const t of [ "airtable_ok", "diff" ]) {
    const filename = path.resolve(`${__dirname}/../build/${database}/${primary}_${t}.json`)
    await writeFile(filename, "[]", `utf-8`)
  }
  for (const t of [ "collisions" ]) {
    const filename = path.resolve(`${__dirname}/../build/${database}/${primary}_${t}.json`)
    await writeFile(filename, "[]", `utf-8`)
  }
}

export async function initialPull(config) {
  for (const table_to_sync of config.sync) {
    await pullTable({
      ...table_to_sync,
      auth_key: config.auth.airtable
    })
  }

  const last_pulled_filename = path.resolve(`${__dirname}/../build/last-pulled.txt`)
  return await writeFile(last_pulled_filename, moment().format('ddd MMM D YYYY h:mm A ZZ'), 'utf-8')
}


