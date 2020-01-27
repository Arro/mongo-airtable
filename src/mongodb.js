import path from 'path'
import { MongoClient } from 'mongodb'
import yaml from 'yaml'

//import deepEqual from 'deep-equal'
//import { each } from 'lodash'

import util from 'util'
import fs from 'fs'
const readFile = util.promisify(fs.readFile)

const url = `mongodb://localhost:27017`

export async function putIntoDB({ primary, mongo_collection, mongo_database }) {
  const client = new MongoClient(url, { useUnifiedTopology: true })
  const connection = await client.connect()
  const db = connection.db(mongo_database)
  const collection = db.collection(mongo_collection)

  const filename = path.resolve(`${__dirname}/../build/test/${primary}.json`)

  let data = await readFile(filename)
  data = JSON.parse(data)

  await collection.deleteMany({})

  if (data && data.length) {
    await collection.insertMany(data)
  }
  await connection.close()
}


export async function initialInsert(config_path) {
  let config = await readFile(config_path, 'utf-8')
  config = yaml.parse(config)

  for (const { airtable_table, collection, database } of config.sync) {
    await putIntoDB({
      airtable_table,
      collection,
      database
    })
  }
}


/*
export async function lookForChanges() {
  // you can pass in --filter Fragments to just update that
  const filter = global_filter

  let sync = config.sync

  if (filter) {
    sync = _.filter(sync, (table) => {
      return table.airtable_table === filter
    })
  }

  console.log(sync)

  for (const table_to_sync of sync) {
    const client = new MongoClient(url, { useUnifiedTopology: true })
    const connection = await client.connect()
    const db = connection.db(table_to_sync.mongo_database)

    const filename = path.resolve(`${__dirname}/${table_to_sync.airtable_table}.json`)
    let data = await readFile(filename)
    data = JSON.parse(data)

    const dont_sync = table_to_sync.dont_sync || []

    let changed = []

    const collection = db.collection(table_to_sync.mongo_collection)

    for (const airtable_record of data) {
      dont_sync.forEach((d) => {
        delete airtable_record[d]
      })

      let mongo_record = await collection.findOne({ __id: airtable_record.__id })
      if (!mongo_record) {
        console.log(`couldn't find ${airtable_record}`)
      } else {
        delete mongo_record._id
        dont_sync.forEach((d) => {
          delete mongo_record[d]
        })

        if (!deepEqual(airtable_record, mongo_record)) {
          let fields_changed = {}
          each(mongo_record, (value, field_name) => {
            if (!deepEqual(airtable_record[field_name], mongo_record[field_name])) {
              fields_changed[field_name] = mongo_record[field_name]
            }
          })

          changed.push({
            id: airtable_record.__id,
            fields_changed
          })
        }
      }
    }
    await connection.close()

    const records_as_json_string = JSON.stringify(changed, null, 4)
    const changed_filename = path.resolve(`${__dirname}/${table_to_sync.airtable_table}_changed.json`)
    return await writeFile(changed_filename, records_as_json_string, `utf-8`)
  }
}


export async function lookForNewItems() {
  // you can pass in --filter Fragments to just update that
  const filter = global_filter

  let sync = config.sync

  if (filter) {
    sync = _.filter(sync, (table) => {
      return table.airtable_table === filter
    })
  }

  for (const table_to_sync of sync) {
    console.log(table_to_sync)
    const client = new MongoClient(url, { useUnifiedTopology: true })
    const connection = await client.connect()
    const db = connection.db(table_to_sync.mongo_database)

    let new_items = []
    const dont_create_with = table_to_sync.dont_create_with || []

    const collection = await db.collection(table_to_sync.mongo_collection)
    let no_id_records = await collection.find({ __id: { $exists: false } }).toArray()

    console.log(no_id_records)

    no_id_records = no_id_records.map((record) => {
      delete record._id
      dont_create_with.forEach((d) => {
        delete record[d]
      })
      return record
    })

    new_items = no_id_records
    await connection.close()

    const records_as_json_string = JSON.stringify(new_items, null, 4)
    const filename = path.resolve(`${__dirname}/${table_to_sync.airtable_table}_new.json`)
    return await writeFile(filename, records_as_json_string, `utf-8`)
  }
}
*/
