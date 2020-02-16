import path from 'path'
import airtable from 'airtable'
import airtableJson from 'airtable-json'

import util from 'util'
import fs from 'fs'
import mkdirp from 'mkdirp'

const writeFile = util.promisify(fs.writeFile)
const readFile = util.promisify(fs.readFile)

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
  const records_as_json_string = JSON.stringify(records, null, 4)

  return await writeFile(json_filename, records_as_json_string, `utf-8`)
}

export async function initialPull(config) {
  for (const table_to_sync of config.sync) {
    await pullTable({
      ...table_to_sync,
      auth_key: config.auth.airtable
    })
  }
}

export async function pushChangedTable({ auth_key, base_name, primary, database }) {
  airtable.configure({ apiKey: auth_key })

  const filename = path.resolve(`${__dirname}/../build/${database}/${primary}_diff.json`)

  let data = await readFile(filename)
  data = JSON.parse(data)

  const base = airtable.base(base_name)

  let unsuccessful_modifies = []

  for (const record of data.modified) {
    try {
      await base(primary).update([{
        id: record.__id,
        fields: {
          ...record.modified_fields
        }
      }])
    } catch(e) {
      unsuccessful_modifies.push(record)
    }
  }
  data.modified = unsuccessful_modifies


  let unsuccessful_creates = []
  for (const record of data.recent) {
    try {
      await base(primary).create([{
        fields: {
          ...record
        }
      }])
    } catch(e) {
      unsuccessful_creates.push(record)
    }
  }
  data.recent = unsuccessful_creates


  let unsuccessful_deletes = []
  for (const record of data.deleted) {
    try {
      await base(primary).destroy([ record.__id ])
    } catch(e) {
      unsuccessful_deletes.push(record)
    }
  }
  data.deleted = unsuccessful_deletes

  const records_as_json_string = JSON.stringify(data, null, 2)
  return await writeFile(filename, records_as_json_string, `utf-8`)
}

export async function pushChanged(config) {
  for (const table of config.sync) {
    const { base_name, primary, database } = table
    console.log(primary)

    await pushChangedTable({
      auth_key: config.auth.airtable,
      base_name,
      primary,
      database
    })
  }
}

