import fs from 'fs'
import path from 'path'

const { writeFile } = fs.promises

export async function resetJsonFiles({ primary, database }) {

  const ok_filename = path.resolve(`${__dirname}/../build/${database}/${primary}_airtable_ok.json`)
  await writeFile(ok_filename, "[]", `utf-8`)

  const recent_filename = path.resolve(`${__dirname}/../build/${database}/${primary}_airtable_recent.json`)
  await writeFile(recent_filename, "[]", `utf-8`)

  const changed_in_airtable_filename = path.resolve(`${__dirname}/../build/${database}/${primary}_changed_in_airtable.json`)
  await writeFile(changed_in_airtable_filename, "{}", `utf-8`)
}
