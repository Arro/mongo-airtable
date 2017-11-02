import gulp from 'gulp'
import path from 'path'
import Promise from 'bluebird'
import mongodb from 'mongodb'
import nconf from 'nconf'
import nconfYAML from 'nconf-yaml'

import _fs from 'fs'
const fs = Promise.promisifyAll(_fs)

const config = nconf.env({ separator: `__`, match: new RegExp(`^config.*`) })
  .file({ file: path.resolve(`${__dirname}/../config.yaml`), format: nconfYAML })
  .get()
  .config

const mongo_client = mongodb.MongoClient

const build = path.resolve(`${__dirname}/../build/`)

gulp.task(`initial-insert`, () => {
  return Promise.all(config.sync.map((table_to_sync) => {
    const db =  mongo_client.connect(
      `mongodb://localhost:27017/${table_to_sync.mongo_database}`,
      { promiseLibrary: Promise }
    )

    const data = fs.readFileAsync(`${build}/${table_to_sync.airtable_table}.json`).then((data) => {
      return JSON.parse(data)
    })

    return Promise.all([db, data]).then(([db, data]) => {
      const collection = db.collection(table_to_sync.mongo_collection)
      return collection.insert(data).then(() => {
        return db.close()
      })
    })
  }))
})
