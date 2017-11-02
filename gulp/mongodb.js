import gulp from 'gulp'
import path from 'path'
import Promise from 'bluebird'
import mongodb from 'mongodb'
import nconf from 'nconf'
import nconfYAML from 'nconf-yaml'
import deepEqual from 'deep-equal'
import sts from 'string-to-stream'
import vss from 'vinyl-source-stream'

import { each } from 'lodash'

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
      return collection.remove({}).then(() => {
        return collection.insert(data).then(() => {
          return db.close()
        })
      })
    })
  }))
})

gulp.task(`look-for-changes`, () => {
  return Promise.all(config.sync.map((table_to_sync) => {
    const db =  mongo_client.connect(
      `mongodb://localhost:27017/${table_to_sync.mongo_database}`,
      { promiseLibrary: Promise }
    )

    const data = fs.readFileAsync(`${build}/${table_to_sync.airtable_table}.json`).then((data) => {
      return JSON.parse(data)
    })

    let changed = []
    return Promise.all([db, data]).then(([db, data]) => {
      const collection = db.collection(table_to_sync.mongo_collection)

      return Promise.reduce(data, ((total, airtable_record) => {
        return collection.findOne({ id: airtable_record.id }).then((mongo_record) => {
          delete mongo_record._id
          if (!deepEqual(airtable_record, mongo_record)) {

            let fields_changed = {}
            each(mongo_record.fields, (value, field_name) => {
              if (!deepEqual(airtable_record.fields[field_name], mongo_record.fields[field_name])) {
                fields_changed[field_name] = mongo_record.fields[field_name]
              }
            })

            changed.push({
              id: airtable_record.id,
              fields_changed
            })
          }
          return Promise.resolve(true)
        })
      }), 0).then(() => {
        return db.close()
      })
    }).then(() => {
      return sts(JSON.stringify(changed, null, 4))
        .pipe(vss(`${table_to_sync.airtable_table}_changed.json`))
        .pipe(gulp.dest(build))
    })
  })).then(() => {
    return Promise.delay(1000)
  })
})

