import airtableJson from "airtable-json"
import fs from "fs-extra"
import path from "path"

export default async function ({
  auth_key,
  base_name,
  primary,
  view,
  database,
  filter,
  populate = [],
  flatten = []
}) {
  console.log(`starting sync of ${primary}`)

  let records = await airtableJson({
    auth_key,
    base_name,
    primary,
    view,
    filter,
    populate
  })
  console.log(`found ${records.length} records`)

  records = records.map((record) => {
    flatten.forEach((f) => {
      record[f] = record[f][0]
    })
    return record
  })

  const local_save_path = path.resolve(process.env.local_save_path)

  const json_dirname = path.join(local_save_path, database)
  await fs.mkdirp(json_dirname)

  const json_filename = path.join(json_dirname, `${primary}.json`)
  const records_as_json_string = JSON.stringify(records, null, 2)
  await fs.writeFile(json_filename, records_as_json_string, `utf-8`)

  for (const t of ["airtable_ok", "diff", "collisions"]) {
    const filename = path.join(json_dirname, `${primary}_${t}.json`)
    await fs.writeFile(filename, "[]", `utf-8`)
  }
}
