import path from 'path'
import nconf from 'nconf'
import nconfYAML from 'nconf-yaml'
import airtable from 'airtable'
import airtableJson from 'airtable-json'
import _ from 'lodash'

import util from 'util'
import fs from 'fs'
const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)

const global_filter = ``

const config = nconf.env({ separator: `__`, match: new RegExp(`^config.*`) })
  .file({ file: path.resolve(`${__dirname}/../config.yaml`), format: nconfYAML })
  .get()
  .config

airtable.configure({ apiKey: config.auth.airtable })

export async function pullTable({ auth_key,  base_name, primary, view, populate=[], flatten=[] }) {
  console.log(`starting sync of ${primary}`)

  let records = await airtableJson({
    auth_key,
    base_name,
    primary,
    view,
    populate,
  })

  records = records.map((record) => {
    flatten.forEach((f) => {
      record[f] = record[f][0]
    })
    return record
  })

  const records_as_json_string = JSON.stringify(records, null, 4)
  const filename = path.resolve(`${__dirname}/../build/${primary}.json`)
  console.log(filename)

  return await writeFile(filename, records_as_json_string, `utf-8`)
}


export async function initialPull() {
  // you can pass in --filter Fragments to just update that
  const filter = global_filter
  let sync = config.sync

  if (filter) {
    sync = _.filter(sync, (table) => {
      return table.airtable_table === filter
    })
  }

  for (const table_to_sync of sync) {
    await pullTable(table_to_sync)
  }
}


async function pushChangedTable(table_to_sync) {
  const base = airtable.base(table_to_sync.airtable_base)
  const filename = path.resolve(`${__dirname}/${table_to_sync.airtable_table}_changed.json`)

  let data
  try {
    data = await readFile(filename)
  } catch {
    return
  }
  data = JSON.parse(data)

  for (const record of data) {
    await base(table_to_sync.airtable_table).update(record.id, record.fields_changed)
  }

  const records_as_json_string = JSON.stringify([], null, 4)
  return await writeFile(filename, records_as_json_string, `utf-8`)
}


export async function pushChanged() {
  const filter = global_filter
  let sync = config.sync

  if (filter) {
    sync = _.filter(sync, (table) => {
      return table.airtable_table === filter
    })
  }

  for (const table of sync) {
    await pushChangedTable(table)
  }
}


async function createNewRecordsInTable(table_to_sync) {
  const base = airtable.base(table_to_sync.airtable_base)
  const filename = path.resolve(`${__dirname}/${table_to_sync.airtable_table}_new.json`)

  let data
  try {
    data = await readFile(filename)
  } catch {
    return
  }

  data = JSON.parse(data)

  const unflatten = table_to_sync.unflatten || []
  const records = data.map((record) => {
    unflatten.forEach((f) => {
      record[f] = [record[f]]
    })
    return record
  })

  for (const record of records) {
    await base(table_to_sync.airtable_table).create(record)
  }

  const records_as_json_string = JSON.stringify([], null, 4)
  return await writeFile(filename, records_as_json_string, `utf-8`)
}

export async function createNew() {
  const filter = global_filter
  let sync = config.sync

  if (filter) {
    sync = _.filter(sync, (table) => {
      return table.airtable_table === filter
    })
  }

  for (const table of sync) {
    await createNewRecordsInTable(table)
  }
}

