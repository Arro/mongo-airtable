import path from "path"
import airtable from "airtable"
import fs from "fs-extra"

export default async function ({ auth_key, base_name, primary, database }) {
  const local_save_path = path.resolve(process.env.local_save_path)
  console.log("\n--> update ok records to airtable")
  airtable.configure({ apiKey: auth_key })

  const filename = path.join(local_save_path, database, `${primary}_diff.json`)

  let data = await fs.readFile(filename)
  data = JSON.parse(data)

  const base = airtable.base(base_name)

  let unsuccessful_modifies = []

  console.log(`---> updating ${data.modified.length} modified in airtable`)
  for (const record of data.modified) {
    try {
      await base(primary).update([
        {
          id: record.__id,
          fields: {
            ...record.modified_fields
          }
        }
      ])
    } catch (e) {
      console.log(`${record.__id} didn't work: `)
      console.log(e)
      unsuccessful_modifies.push(record)
    }
  }
  data.modified = unsuccessful_modifies

  let unsuccessful_creates = []
  console.log(
    `---> creating ${data.recent.length} local-only records to airtable`
  )
  for (const record of data.recent) {
    console.log(record)
    try {
      await base(primary).create([
        {
          fields: {
            ...record
          }
        }
      ])
    } catch (e) {
      unsuccessful_creates.push(record)
    }
  }
  data.recent = unsuccessful_creates

  let unsuccessful_deletes = []
  for (const record of data.deleted) {
    try {
      await base(primary).destroy([record.__id])
    } catch (e) {
      unsuccessful_deletes.push(record)
    }
  }
  data.deleted = unsuccessful_deletes
  console.log(
    `---> deleting ${data.deleted.length} locally-deleted records in airtable`
  )

  const records_as_json_string = JSON.stringify(data, null, 2)
  return await fs.writeFile(filename, records_as_json_string, `utf-8`)
}
