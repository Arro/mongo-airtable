import path from "path"
import airtable from "airtable"
import fs from "fs"

const { readFile, writeFile } = fs.promises

export async function updateOKRecordsToAirtableAll(config) {
  for (const table of config.sync) {
    const { base_name, primary, database } = table
    console.log(primary)

    await updateOKRecordsToAirtable({
      auth_key: config.auth.airtable,
      base_name,
      primary,
      database
    })
  }
}

export async function updateOKRecordsToAirtable({
  auth_key,
  base_name,
  primary,
  database
}) {
  console.log("\n--> update ok records to airtable")
  airtable.configure({ apiKey: auth_key })

  const filename = path.resolve(
    `${__dirname}/../build/${database}/${primary}_diff.json`
  )

  let data = await readFile(filename)
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
  return await writeFile(filename, records_as_json_string, `utf-8`)
}
