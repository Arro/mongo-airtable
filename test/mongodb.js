import path from 'path'
import util from 'util'
import fs from 'fs'
import test from 'ava'
import mkdirp from 'mkdirp'
import rimraf from 'rimraf'
import yaml from 'yaml'

import { putIntoDB, initialInsert, lookForChanges } from '../src/mongodb'

import { MongoClient } from 'mongodb'
const url = `mongodb://localhost:27017`

const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)
const removeFolder = util.promisify(rimraf)


test.beforeEach(async(t) => {
  const output_dirname = path.resolve(`${__dirname}/../build/test`)
  await removeFolder(output_dirname)
  await mkdirp(output_dirname)

  const client = new MongoClient(url, { useUnifiedTopology: true })
  const connection = await client.connect()
  const db = connection.db("test")

  await db.collection("furniture").removeMany({})
  await db.collection("books").removeMany({})

  const f_fixture_filename = path.resolve(`${__dirname}/../test/fixtures/airtable-transformed/000_furniture.json`)
  const f_fixture_text = await readFile(f_fixture_filename)
  const f_fixture = JSON.parse(f_fixture_text)

  const b_fixture_filename = path.resolve(`${__dirname}/../test/fixtures/airtable-transformed/001_books.json`)
  const b_fixture_text = await readFile(b_fixture_filename)
  const b_fixture = JSON.parse(b_fixture_text)

  const f2_fixture_filename = path.resolve(`${__dirname}/../test/fixtures/airtable-transformed/002_furniture_transformed.json`)
  const f2_fixture_text = await readFile(f2_fixture_filename)
  const f2_fixture = JSON.parse(f2_fixture_text)

  const f3_fixture_filename = path.resolve(`${__dirname}/../test/fixtures/airtable-transformed/003_furniture_diff.json`)
  const f3_fixture_text = await readFile(f3_fixture_filename)
  const f3_fixture = JSON.parse(f3_fixture_text)

  const config_filename = path.resolve(`${__dirname}/../test/fixtures/config-yaml/000_furniture_and_books.yaml`)
  const config_text = await readFile(config_filename, 'utf-8')
  const config = yaml.parse(config_text)

  const config2_filename = path.resolve(`${__dirname}/../test/fixtures/config-yaml/001_furniture.yaml`)
  const config2_text = await readFile(config2_filename, 'utf-8')
  const config2 = yaml.parse(config2_text)

  t.context = {
    db,
    connection,
    f_fixture_text,
    f_fixture,
    b_fixture_text,
    b_fixture,
    f2_fixture_text,
    f2_fixture,
    f3_fixture,
    output_dirname,
    config,
    config2
  }
})

test.afterEach(async(t) => {
  t.context.connection.close()
})

test.serial("it puts into db correctly", async(t) => {
  const { output_dirname, f_fixture_text, f_fixture, db } = t.context

  const output_filename = path.resolve(`${output_dirname}/Furniture.json`)
  await writeFile(output_filename, f_fixture_text, 'utf-8')

  await putIntoDB({
    primary: "Furniture",
    collection: "furniture",
    database: "test"
  })

  const collection = db.collection("furniture")
  let furniture_in_mongo = await collection.find().toArray()
  furniture_in_mongo.forEach(f => delete f._id)

  t.deepEqual(furniture_in_mongo, f_fixture)
})


test.serial("can loop through config tables", async(t) => {
  const { output_dirname, f_fixture, f_fixture_text, b_fixture, b_fixture_text, config, db } = t.context

  const f_output_filename = path.resolve(`${output_dirname}/Furniture.json`)
  await writeFile(f_output_filename, f_fixture_text, 'utf-8')

  const b_output_filename = path.resolve(`${output_dirname}/Books.json`)
  await writeFile(b_output_filename, b_fixture_text, 'utf-8')

  await initialInsert(config)

  const f_collection = db.collection("furniture")
  let furniture_in_mongo = await f_collection.find().toArray()
  furniture_in_mongo.forEach(f => delete f._id)

  const b_collection = db.collection("books")
  let books_in_mongo = await b_collection.find().toArray()
  books_in_mongo.forEach(b => delete b._id)

  t.deepEqual(furniture_in_mongo, f_fixture)
  t.deepEqual(books_in_mongo, b_fixture)
})


test.serial("can check for new ones", async(t) => {
  const { output_dirname, f_fixture_text, f2_fixture, db, config2, f3_fixture } = t.context

  const output_filename = path.resolve(`${output_dirname}/Furniture.json`)
  await writeFile(output_filename, f_fixture_text, 'utf-8')

  const collection = db.collection("furniture")
  await collection.insertMany(f2_fixture)

  await lookForChanges(config2)

  const diff_filename = path.resolve(`${output_dirname}/Furniture_diff.json`)
  const diff_text = await readFile(diff_filename, 'utf-8')
  const diffs = JSON.parse(diff_text)

  t.deepEqual(diffs, f3_fixture)

})

