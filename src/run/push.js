import updateOKRecordsToAirtable from "../update-ok-records-to-airtable"
import validateEnv from "../validate-env"
;(async function () {
  validateEnv()
  const tables = process.env.yaml_config.sync
  for (const table of tables) {
    const { base_name, primary, database } = table
    console.log(primary)

    await updateOKRecordsToAirtable({
      auth_key: process.env.yaml_config.airtable_key,
      base_name,
      primary,
      database
    })
  }
})()
