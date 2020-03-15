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
  for (const table of config.sync) {
    await lookForChangesTable(table)
  }
}

export async function lookForChangesTable({ primary, database, collection, flatten }) {
  const client = new MongoClient(url, { useUnifiedTopology: true })
  const connection = await client.connect()
  const db = connection.db(database)
  collection = db.collection(collection)

  const filename = path.resolve(`${__dirname}/../build/${database}/${primary}.json`)
  let original_records = await readFile(filename)
  original_records = JSON.parse(original_records)


  let modified = []
  let deleted = []

  for (const original_record of original_records) {
    let mongo_record = await collection.findOne({ __id: original_record.__id })

    if (!mongo_record) {
      deleted.push(original_record)
      continue
    }

    delete mongo_record._id
    for (const d of flatten) {
      delete original_record[d]
      delete mongo_record[d]
    }

    if (deepEqual(original_record, mongo_record)) continue

    let modified_fields = {}
    for (const field in mongo_record) {
      if (deepEqual(original_record[field], mongo_record[field])) continue
      modified_fields[field] = mongo_record[field]
    }

    for (const field in original_record) {
      if (mongo_record[field] === undefined) {
        modified_fields[field] = null
      }
    }

    modified.push({
      __id: original_record.__id,
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
