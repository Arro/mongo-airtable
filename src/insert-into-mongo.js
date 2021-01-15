import path from "path"
import { MongoClient } from "mongodb"
import fs from "fs-extra"
import dotenv from "dotenv"

dotenv.config()

export default async function ({ primary, collection, database }) {
  const url = `${process.env.mongo_url}/${process.env.mongo_db}`
  const client = new MongoClient(url, { useUnifiedTopology: true })
  const connection = await client.connect()
  const db = connection.db(database)
  collection = db.collection(collection)

  const local_save_path = path.resolve(process.env.local_save_path)
  const filename = path.join(local_save_path, database, `${primary}.json`)

  let data = await fs.readFile(filename)
  data = JSON.parse(data)

  await collection.removeMany({})

  if (data.length > 0) await collection.insertMany(data)

  await connection.close()
}
