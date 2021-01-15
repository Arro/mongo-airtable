import fs from "fs-extra"
import path from "path"

export default async function ({ table }) {
  console.log("\n--> check for conflicts")
  const { database, primary } = table

  const local_save_path = path.resolve(process.env.local_save_path)
  const changed_in_airtable_filename = path.join(
    local_save_path,
    database,
    `${primary}_changed_in_airtable.json`
  )
  let changed_in_airtable = await fs.readFile(
    changed_in_airtable_filename,
    "utf-8"
  )
  changed_in_airtable = JSON.parse(changed_in_airtable)
  const { modified: airtable_modified, recent } = changed_in_airtable

  const diff_filename = path.join(
    local_save_path,
    database,
    `${primary}_diff.json`
  )
  let diff = await fs.readFile(diff_filename, "utf-8")
  diff = JSON.parse(diff)
  const { modified: mongo_modified } = diff

  let collisions = []
  let airtable_ok_to_update = []

  for (const a of airtable_modified) {
    const found_index = mongo_modified.findIndex((m) => {
      return m.__id === a.__id
    })
    const found = mongo_modified[found_index]

    if (found_index === -1) {
      airtable_ok_to_update.push(a)
      continue
    }

    // if they modify different fields, no need for collision
    let has_conflict = false
    for (const a_field in a.modified_fields) {
      const a_val = a.modified_fields[a_field]
      const f_val = found.modified_fields[a_field]

      if (f_val && a_val !== f_val) {
        has_conflict = true
      }
    }

    if (!has_conflict) {
      airtable_ok_to_update.push(a)
      continue
    }

    collisions.push({
      airtable: a,
      mongo: found
    })

    //  need to remove from mongo modified here, because it's not safe to update to mongo in that case
    mongo_modified.splice(found_index, 1)
  }

  console.log(`---> there were ${collisions.length} collisions`)
  console.log(`---> there were ${airtable_ok_to_update.length} non-collisions`)

  const collisions_string = JSON.stringify(collisions, null, 2)
  const collisions_filename = path.join(
    local_save_path,
    database,
    `${primary}_collisions.json`
  )
  await fs.writeFile(collisions_filename, collisions_string, "utf-8")

  const airtable_ok_string = JSON.stringify(airtable_ok_to_update, null, 2)
  const airtable_ok_filename = path.join(
    local_save_path,
    database,
    `${primary}_airtable_ok.json`
  )
  await fs.writeFile(airtable_ok_filename, airtable_ok_string, "utf-8")

  // recent ones guaranteed not to have conflicts
  const recent_string = JSON.stringify(recent, null, 2)
  const recent_filename = path.join(
    local_save_path,
    database,
    `${primary}_airtable_recent.json`
  )
  await fs.writeFile(recent_filename, recent_string, "utf-8")

  // overwrite diff file
  diff.modified = mongo_modified
  const diff_string = JSON.stringify(diff, null, 2)
  await fs.writeFile(diff_filename, diff_string, "utf-8")
}
