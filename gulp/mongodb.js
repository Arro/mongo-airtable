import gulp from 'gulp'
import path from 'path'
import Promise from 'bluebird'
import mongodb from 'mongodb'
import nconf from 'nconf'
import nconfYAML from 'nconf-yaml'
import deepEqual from 'deep-equal'
import sts from 'string-to-stream'
import vss from 'vinyl-source-stream'
import { argv } from 'yargs'
import _ from 'lodash'

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
  // you can pass in --filter Fragments to just update that
  const { filter } = argv
  let sync = config.sync

  if (filter) {
    sync = _.filter(sync, (table) => {
      return table.airtable_table === filter
    })
  }

  return Promise.all(sync.map((table_to_sync) => {
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
        if (data && data.length) {
          return collection.insert(data).then(() => {
            return db.close()
          })
        } else {
          return db.close()
        }
      })
    })
  }))
})

gulp.task(`look-for-changes`, () => {
  return Promise.all(config.sync.map((table_to_sync) => {
    console.log(table_to_sync)
    const db =  mongo_client.connect(
      `mongodb://localhost:27017/${table_to_sync.mongo_database}`,
      { promiseLibrary: Promise }
    )

    const data = fs.readFileAsync(`${build}/${table_to_sync.airtable_table}.json`).then((data) => {
      return JSON.parse(data)
    })


    const dont_sync = table_to_sync.dont_sync || []

    let changed = []
    return Promise.all([db, data]).then(([db, data]) => {
      const collection = db.collection(table_to_sync.mongo_collection)

      return Promise.reduce(data, ((total, airtable_record) => {
        dont_sync.forEach((d) => {
          delete airtable_record[d]
        })

        return collection.findOne({ __id: airtable_record.__id }).then((mongo_record) => {
          if (!mongo_record) {
            console.log(`couldn't find ${airtable_record}`)
            return Promise.resolve(true)
          }

          delete mongo_record._id
          dont_sync.forEach((d) => {
            delete mongo_record[d]
          })

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

gulp.task(`look-for-new-items`, () => {
  return Promise.all(config.sync.map((table_to_sync) => {
    const db =  mongo_client.connect(
      `mongodb://localhost:27017/${table_to_sync.mongo_database}`,
      { promiseLibrary: Promise }
    )
    let new_items = []
    const dont_create_with = table_to_sync.dont_create_with || []
    return Promise.all([db]).then(([db]) => {
      const collection = db.collection(table_to_sync.mongo_collection)
      return collection.find({ __id: { $exists: false } }).toArray().then((no_id_records) => {
        no_id_records = no_id_records.map((record) => {
          delete record._id
          dont_create_with.forEach((d) => {
            delete record[d]
          })
          return record
        })

        new_items = no_id_records
        return db.close()
      }).then(() => {
        return sts(JSON.stringify(new_items, null, 4))
          .pipe(vss(`${table_to_sync.airtable_table}_new.json`))
          .pipe(gulp.dest(build))
      })
    })
  })).then(() => {
    return Promise.delay(1000)
  })
})
