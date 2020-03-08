import fs from 'fs'
import path from 'path'
import _ from 'lodash'
import airtableJson from 'airtable-json'
import { lookForChanges } from './mongodb'
import { pushChangedTable } from './airtable'
import deepEqual from 'deep-equal'
// import { MongoClient } from 'mongodb'

const { readFile, writeFile } = fs.promises

export async function seeWhatChanged(config) {
  const auth_key  = config.auth.airtable

  const last_pulled_filename = path.resolve(`${__dirname}/../build/last-pulled.txt`)
  let last_pulled = await readFile(last_pulled_filename, 'utf-8')

  await lookForChanges(config)

  for (const table of config.sync.slice(0, 1)) {
    await seeWhatChangedInAirtable({ auth_key, table, last_pulled })
    await threeWayMerge({ table })
    await pushChangedTable({ ...table, auth_key})
  }

  // const last_pulled_filename = path.resolve(`${__dirname}/../build/last-pulled.txt`)
  // return await writeFile(last_pulled_filename, `${+new Date()}`, `utf-8`)
}


async function seeWhatChangedInAirtable({ auth_key, table, last_pulled }) {
  const { base_name, primary, view, populate, database } = table
  console.log(table)
  
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

    modified.push({
      __id: airtable_record.__id,
      ...modified_fields
    })
  }

  const json_string = JSON.stringify({ recent, modified }, null, 2)
  const json_filename = path.resolve(`${__dirname}/../build/${database}/${primary}_changed_in_airtable.json`)
  await writeFile(json_filename, json_string, `utf-8`)

}


async function threeWayMerge({ table }) {

  const { database, primary } = table

  const changed_in_airtable_filename = path.resolve(`${__dirname}/../build/${database}/${primary}_changed_in_airtable.json`)
  let changed_in_airtable = await readFile(changed_in_airtable_filename, `utf-8`)
  console.log(`changed_in_airtable`)
  console.log(changed_in_airtable)
  changed_in_airtable = JSON.parse(changed_in_airtable)
  const { modified: airtable_modified } = changed_in_airtable

  const diff_filename = path.resolve(`${__dirname}/../build/${database}/${primary}_diff.json`)
  let diff = await readFile(diff_filename, `utf-8`)
  console.log(`diff`)
  diff = JSON.parse(diff)
  console.log(diff)
  const { modified: mongo_modified } = diff
  
  let collisions = []
  let airtable_ok_to_update = []


  for (const a of airtable_modified) {
    const found = _.find(mongo_modified, (m) => {
      return m.__id === a.__id
    })
    if (!found) {
      airtable_ok_to_update.push(a)
      continue
    }

    // if they agree, no need for collision
    // if they modify different fields, no need for collision
    let has_conflict = false
    for (const a_field in a.modified) {
      if (found.modified[a_field] && (a.modified[a_field] !== found.modified[a_field])) {
        has_conflict = true
      }
    }
    
    if (has_conflict) {
      collisions.push({
        airtable: a,
        mongo: found
      })
    } else {
      airtable_ok_to_update.push(a)
    }
  }
  console.log(`there were ${collisions.length} collisions`)
  console.log(`there were ${airtable_ok_to_update.length} non-collisions`)

  const collisions_string = JSON.stringify(collisions, null, 2)
  const collisions_filename = path.resolve(`${__dirname}/../build/${database}/${primary}_collisions.json`)
  await writeFile(collisions_filename, collisions_string, `utf-8`)

  const ok_string = JSON.stringify(airtable_ok_to_update, null, 2)
  const ok_filename = path.resolve(`${__dirname}/../build/${database}/${primary}_airtable_ok.json`)
  await writeFile(ok_filename, ok_string, `utf-8`)


  /*
  let { collection } = table
  const client = new MongoClient(`mongodb://localhost:27017`, { useUnifiedTopology: true })
  const connection = await client.connect()
  const db = connection.db(database)
  collection = db.collection(collection)

  for (let update of changed_in_airtable) {
    delete update._id
    await collection.updateOne({ __id: update.__id}, { $set: { ...update }}, { upsert: true })
  }

  await connection.close()
  */
}



