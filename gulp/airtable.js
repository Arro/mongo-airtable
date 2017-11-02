import gulp from 'gulp'
import path from 'path'
import nconf from 'nconf'
import nconfYAML from 'nconf-yaml'
import sts from 'string-to-stream'
import vss from 'vinyl-source-stream'
import airtable from 'airtable'
import Promise from 'bluebird'

import _fs from 'fs'
const fs = Promise.promisifyAll(_fs)

const config = nconf.env({ separator: `__`, match: new RegExp(`^config.*`) })
  .file({ file: path.resolve(`${__dirname}/../config.yaml`), format: nconfYAML })
  .get()
  .config

const build = path.resolve(`${__dirname}/../build/`)

airtable.configure({ apiKey: config.auth.airtable })

gulp.task(`initial-pull`, () => {
  return Promise.all(config.sync.map((table_to_sync) => {
    const base = airtable.base(table_to_sync.airtable_base)
    return base(table_to_sync.airtable_table).select({ view: table_to_sync.airtable_view }).all().then((records) => {
      records = records.map((record) => {
        return record._rawJson
      })
      return sts(JSON.stringify(records, null, 4))
        .pipe(vss(`${table_to_sync.airtable_table}.json`))
        .pipe(gulp.dest(build))
    })
  })).then(() => {
    return Promise.delay(1000) // this shouldn't be necessary
  })
})

gulp.task(`push-changed`, () => {
  return Promise.all(config.sync.map((table_to_sync) => {
    const base = airtable.base(table_to_sync.airtable_base)
    return fs.readFileAsync(`${build}/${table_to_sync.airtable_table}_changed.json`).then((data) => {
      return JSON.parse(data)
    }).then((data) => {
      return Promise.reduce(data, ((total, record) => {
        return base(table_to_sync.airtable_table).update(record.id, record.fields_changed)
      }), 0)
    }).then(() => {
      return sts(JSON.stringify([], null, 4))
        .pipe(vss(`${table_to_sync.airtable_table}_changed.json`))
        .pipe(gulp.dest(build))
    })
  }))
})
