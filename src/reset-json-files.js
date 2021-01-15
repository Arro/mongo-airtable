import fs from "fs-extra"
import path from "path"

export default async function ({ primary, database }) {
  const local_save_path = path.resolve(process.env.local_save_path)

  const ok_filename = path.join(
    local_save_path,
    database,
    `${primary}_airtable_ok.json`
  )

  await fs.writeFile(ok_filename, "[]", "utf-8")

  const recent_filename = path.join(
    local_save_path,
    database,
    `${primary}_airtable_recent.json`
  )

  await fs.writeFile(recent_filename, "[]", "utf-8")

  const changed_in_airtable_filename = path.join(
    local_save_path,
    database,
    `${primary}_changed_in_airtable.json`
  )

  await fs.writeFile(changed_in_airtable_filename, "{}", "utf-8")
}
