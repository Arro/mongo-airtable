import path from 'path'
import util from 'util'
import fs from 'fs'
import test from 'ava'
import mkdirp from 'mkdirp'
import deepEqual from 'deep-equal'

import { putIntoDB } from '../src/mongodb'

import { MongoClient } from 'mongodb'
const url = `mongodb://localhost:27017`

const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)

test("it puts into db correctly", async(t) => {

  const output_dirname = path.resolve(`${__dirname}/build/test`)
  await mkdirp(output_dirname)
  const output_filename = path.resolve(`${output_dirname}/Furniture.json`)

  const fixture_filename = path.resolve(`${__dirname}/../test/fixtures/airtable-transformed/000_furniture.json`)
  const fixture_text = await readFile(fixture_filename)

  await writeFile(output_filename, fixture_text, 'utf-8')

  await putIntoDB({
    primary: "Furniture",
    mongo_collection: "furniture",
    mongo_database: "test"
  })

  const client = new MongoClient(url, { useUnifiedTopology: true })
  const connection = await client.connect()
  const db = connection.db("test")
  const collection = db.collection("furniture")

  let furniture_in_mongo = await collection.find().toArray()
 
  furniture_in_mongo.forEach(f => delete f._id)

  t.true(deepEqual(furniture_in_mongo, JSON.parse(fixture_text)))
})



