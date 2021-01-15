import seeWhatChanged from "../see-what-changed"
import validateEnv from "../validate-env"
;(async function () {
  validateEnv()
  await seeWhatChanged(process.env.yaml_config)
})()
