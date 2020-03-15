import fs from 'fs'
import path from 'path'
const { readFile, writeFile } = fs.promises
import _ from 'lodash'

export async function checkForConflicts({ table }) {

  const { database, primary } = table

  const changed_in_airtable_filename = path.resolve(`${__dirname}/../build/${database}/${primary}_changed_in_airtable.json`)
  let changed_in_airtable = await readFile(changed_in_airtable_filename, `utf-8`)
  changed_in_airtable = JSON.parse(changed_in_airtable)
  const { modified: airtable_modified } = changed_in_airtable

  const diff_filename = path.resolve(`${__dirname}/../build/${database}/${primary}_diff.json`)
  let diff = await readFile(diff_filename, `utf-8`)
  diff = JSON.parse(diff)
  const { modified: mongo_modified } = diff
  
  let collisions = []
  let airtable_ok_to_update = []

  for (const a of airtable_modified) {
    const found_index = _.findIndex(mongo_modified, (m) => {
      return m.__id === a.__id
    })
    const found = mongo_modified[found_index]

    if (found_index === -1) {
      airtable_ok_to_update.push(a)
      continue
    }

    // if they modify different fields, no need for collision
    let has_conflict = false
    for (const a_field in a.modified) {
      if (found.modified[a_field] && (a.modified[a_field] !== found.modified[a_field])) {
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
    //  TODO modify _diff file instead
    mongo_modified.splice(found_index, 1)
  }

  console.log(`there were ${collisions.length} collisions`)
  console.log(`there were ${airtable_ok_to_update.length} non-collisions`)

  const collisions_string = JSON.stringify(collisions, null, 2)
  const collisions_filename = path.resolve(`${__dirname}/../build/${database}/${primary}_collisions.json`)
  await writeFile(collisions_filename, collisions_string, `utf-8`)

  const airtable_ok_string = JSON.stringify(airtable_ok_to_update, null, 2)
  const airtable_ok_filename = path.resolve(`${__dirname}/../build/${database}/${primary}_airtable_ok.json`)
  await writeFile(airtable_ok_filename, airtable_ok_string, `utf-8`)

  const mongo_ok_string = JSON.stringify(mongo_modified, null, 2)
  const mongo_ok_filename = path.resolve(`${__dirname}/../build/${database}/${primary}_mongo_ok.json`)
  await writeFile(mongo_ok_filename, mongo_ok_string, `utf-8`)

  await writeFile(changed_in_airtable_filename, "{}", `utf-8`)
}
