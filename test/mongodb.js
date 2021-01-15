import path from "path"
import fs from "fs-extra"
import test from "ava"
import yaml from "yaml"

import validateEnv from "../validate-env"
import insertIntoMongo from "../src/insert-into-mongo"
import lookForChangesInMongo from "../src/look-for-changes-in-mongo"

import { MongoClient } from "mongodb"

test.beforeEach(async (t) => {
  validateEnv()
  const local_save_path = path.resolve(process.env.local_save_path)
  const output_dirname = path.join(local_save_path, "test")
  await fs.remove(output_dirname)
  await fs.mkdirp(output_dirname)

  const client = new MongoClient(process.env.mongo_url, {
    useUnifiedTopology: true
  })
  const connection = await client.connect()
  const db = connection.db("test")

  await db.collection("furniture").removeMany({})
  await db.collection("books").removeMany({})

  let fixtures = {
    f: "airtable-transformed/000_furniture.json",
    b: "airtable-transformed/001_books.json",
    f2: "airtable-transformed/002_furniture_transformed.json",
    f3: "airtable-transformed/003_furniture_diff.json",
    config: "config-yaml/000_furniture_and_books.yaml",
    config2: "config-yaml/001_furniture.yaml"
  }
  let fixture_texts = {}

  for (const name in fixtures) {
    const filepath = fixtures[name]
    const fixture_filename = path.join(
      __dirname,
      "..",
      "test",
      "fixtures",
      "filepath"
    )
    fixture_texts[name] = await fs.readFile(fixture_filename, "utf-8")
    if (filepath.endsWith("json"))
      fixtures[name] = JSON.parse(fixture_texts[name])
    if (filepath.endsWith("yaml"))
      fixtures[name] = yaml.parse(fixture_texts[name])
  }

  t.context = {
    db,
    connection,
    fixtures,
    fixture_texts,
    output_dirname
  }
})

test.afterEach(async (t) => {
  t.context.connection.close()
})

test.serial("it puts into db correctly", async (t) => {
  const { output_dirname, fixture_texts, fixtures, db } = t.context

  const output_filename = path.resolve(`${output_dirname}/Furniture.json`)
  await fs.writeFile(output_filename, fixture_texts.f, "utf-8")

  await insertIntoMongo({
    primary: "Furniture",
    collection: "furniture",
    database: "test"
  })

  const collection = db.collection("furniture")
  let furniture_in_mongo = await collection.find().toArray()
  furniture_in_mongo.forEach((f) => delete f._id)

  t.deepEqual(furniture_in_mongo, fixtures.f)
})

/*
test.serial("can loop through config tables", async (t) => {
  const { output_dirname, fixtures, fixture_texts, db } = t.context

  const f_output_filename = path.resolve(`${output_dirname}/Furniture.json`)
  await fs.writeFile(f_output_filename, fixture_texts.f, "utf-8")

  const b_output_filename = path.resolve(`${output_dirname}/Books.json`)
  await fs.writeFile(b_output_filename, fixture_texts.b, "utf-8")

  await initialInsert(fixtures.config)

  const f_collection = db.collection("furniture")
  let furniture_in_mongo = await f_collection.find().toArray()
  furniture_in_mongo.forEach((f) => delete f._id)

  const b_collection = db.collection("books")
  let books_in_mongo = await b_collection.find().toArray()
  books_in_mongo.forEach((b) => delete b._id)

  t.deepEqual(furniture_in_mongo, fixtures.f)
  t.deepEqual(books_in_mongo, fixtures.b)
})
*/

test.serial("can check for new ones", async (t) => {
  const { output_dirname, fixture_texts, fixtures, db } = t.context

  const output_filename = path.resolve(`${output_dirname}/Furniture.json`)
  await fs.writeFile(output_filename, fixture_texts.f, "utf-8")

  const collection = db.collection("furniture")
  await collection.insertMany(fixtures.f2)

  // this will break
  await lookForChangesInMongo(fixtures.config2)

  const diff_filename = path.resolve(`${output_dirname}/Furniture_diff.json`)
  const diff_text = await fs.readFile(diff_filename, "utf-8")
  const diffs = JSON.parse(diff_text)

  t.deepEqual(diffs, fixtures.f3)
})
