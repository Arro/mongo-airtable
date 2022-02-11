import fs from "fs-extra"
import path from "path"
import { MongoClient } from "mongodb"
import dotenv from "dotenv"

dotenv.config()

export default async function ({ table }) {
  const local_save_path = path.resolve(process.env.local_save_path)
  console.log("\n--> update ok records to mongo")

  const { database, primary } = table
  let { collection } = table
  const client = new MongoClient(process.env.MONGO_URL, {
    useUnifiedTopology: true
  })
  const connection = await client.connect()
  const db = connection.db(database)
  collection = db.collection(collection)

  const ok_filename = path.join(
    local_save_path,
    database,
    `${primary}_airtable_ok.json`
  )
  let ok_airtable_updates = await fs.readFile(ok_filename, `utf-8`)
  ok_airtable_updates = JSON.parse(ok_airtable_updates)

  console.log(`---> updating ${ok_airtable_updates.length} records in mongo`)
  for (let update of ok_airtable_updates) {
    for (const field in update.modified_fields) {
      if (field === "__id") {
        continue
      }
      if (update[field] === null) {
        await collection.updateOne(
          { __id: update.__id },
          { $unset: { [field]: "" } }
        )
      } else {
        await collection.updateOne(
          { __id: update.__id },
          { $set: { [field]: update.modified_fields[field] } },
          { upsert: true }
        )
      }
    }
  }

  const recent_filename = path.join(
    local_save_path,
    database,
    `${primary}_airtable_recent.json`
  )
  let recent_airtable_records = await fs.readFile(recent_filename, "utf-8")
  recent_airtable_records = JSON.parse(recent_airtable_records)
  console.log(
    `---> adding ${recent_airtable_records.length} recent records in mongo`
  )
  for (const record of recent_airtable_records) {
    await collection.insertOne(record)
  }

  let all_records = await collection.find({}).toArray()
  all_records = all_records.map((r) => {
    delete r._id
    return r
  })

  const output_filename = path.join(
    local_save_path,
    database,
    `${primary}.json`
  )
  const output_string = JSON.stringify(all_records, null, 2)
  await fs.writeFile(output_filename, output_string, `utf-8`)

  await connection.close()
}
