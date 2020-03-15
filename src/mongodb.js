import path from 'path'
import { MongoClient } from 'mongodb'

import deepEqual from 'deep-equal'

import util from 'util'
import fs from 'fs'
const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)

const url = `mongodb://localhost:27017`

export async function putIntoDB({ primary, collection, database }) {
  const client = new MongoClient(url, { useUnifiedTopology: true })
  const connection = await client.connect()
  const db = connection.db(database)
  collection = db.collection(collection)

  const filename = path.resolve(`${__dirname}/../build/${database}/${primary}.json`)

  let data = await readFile(filename)
  data = JSON.parse(data)

  await collection.removeMany({})

  await collection.insertMany(data)

  await connection.close()
}


export async function initialInsert(config) {
  for (const { primary, collection, database } of config.sync) {
    await putIntoDB({
      primary,
      collection,
      database
    })
  }
}


export async function lookForChanges(config) {
  for (let { primary, database, collection, flatten} of config.sync) {
    const client = new MongoClient(url, { useUnifiedTopology: true })
    const connection = await client.connect()
    const db = connection.db(database)
    collection = db.collection(collection)

    const filename = path.resolve(`${__dirname}/../build/${database}/${primary}.json`)
    let airtable_records = await readFile(filename)
    airtable_records = JSON.parse(airtable_records)


    let modified = []
    let deleted = []

    for (const airtable_record of airtable_records) {
      let mongo_record = await collection.findOne({ __id: airtable_record.__id })

      if (!mongo_record) {
        deleted.push(airtable_record)
        continue
      }

      delete mongo_record._id
      for (const d of flatten) {
        delete airtable_record[d]
        delete mongo_record[d]
      }

      if (deepEqual(airtable_record, mongo_record)) continue

      let modified_fields = {}
      for (const field in mongo_record) {
        if (deepEqual(airtable_record[field], mongo_record[field])) continue
        modified_fields[field] = mongo_record[field]
      }

      for (const field in airtable_record) {
        if (mongo_record[field] === undefined) {
          modified_fields[field] = null
        }
      }

      modified.push({
        __id: airtable_record.__id,
        modified_fields
      })
      
    }

    let recent = await collection.find({ __id: { $exists: false } }).toArray()

    for (let record of recent) {
      delete record._id
      for (const d of flatten) {
        delete record[d]
      }
    }

    const json_string = JSON.stringify({ modified, deleted, recent }, null, 4)
    const json_filename = path.resolve(`${__dirname}/../build/${database}/${primary}_diff.json`)
    await writeFile(json_filename, json_string, `utf-8`)

    await connection.close()
  }
}

