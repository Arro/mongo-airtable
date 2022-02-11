import dotenv from "dotenv"
import fs from "fs-extra"
import path from "path"
import yaml from "yaml"

dotenv.config()

export default async function () {
  const must_include = ["yaml_config_path", "local_save_path", "airtable_key"]
  for (const key of must_include) {
    if (!process.env[key]) {
      throw new Error(`You need to include ${key} in your .env.`)
    }
  }

  const local_save_path = path.resolve(process.env.local_save_path)
  await fs.mkdirp(local_save_path)

  let yaml_config = await fs.readFile(process.env.yaml_config_path, "utf-8")
  process.env.yaml_config = yaml.parse(yaml_config)
}
