import gulp from 'gulp'
import path from 'path'
import nconf from 'nconf'
import nconfYAML from 'nconf-yaml'
import sts from 'string-to-stream'
import vss from 'vinyl-source-stream'
import airtable from 'airtable'
import airtableJson from 'airtable-json'
import Promise from 'bluebird'
import { argv } from 'yargs'
import _ from 'lodash'

import _fs from 'fs'
const fs = Promise.promisifyAll(_fs)

const config = nconf.env({ separator: `__`, match: new RegExp(`^config.*`) })
  .file({ file: path.resolve(`${__dirname}/../config.yaml`), format: nconfYAML })
  .get()
  .config

const build = path.resolve(`${__dirname}/../build/`)

airtable.configure({ apiKey: config.auth.airtable })

gulp.task(`initial-pull`, () => {
  // you can pass in --filter Fragments to just update that
  const { filter } = argv
  let sync = config.sync

  if (filter) {
    sync = _.filter(sync, (table) => {
      return table.airtable_table === filter
    })
  }

  return Promise.reduce(sync, ((foo, table_to_sync) => {
    console.log(`starting sync of ${table_to_sync.airtable_table}`)

    return airtableJson({
      base: airtable.base(table_to_sync.airtable_base),
      primary: table_to_sync.airtable_table,
      view: table_to_sync.airtable_view,
      populate: [],
    }).then((records) => {
      const flatten = table_to_sync.flatten || []
      records = records.map((record) => {
        flatten.forEach((f) => {
          record[f] = record[f][0]
        })
        return record
      })

      return sts(JSON.stringify(records, null, 4))
        .pipe(vss(`${table_to_sync.airtable_table}.json`))
        .pipe(gulp.dest(build))
    })
  }), 0).then(() => {
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

gulp.task(`create-new`, () => {
  return Promise.all(config.sync.map((table_to_sync) => {
    const base = airtable.base(table_to_sync.airtable_base)
    return fs.readFileAsync(`${build}/${table_to_sync.airtable_table}_new.json`).then((data) => {
      return JSON.parse(data)
    }).then((data) => {
      const unflatten = table_to_sync.unflatten || []
      const records = data.map((record) => {
        unflatten.forEach((f) => {
          record[f] = [record[f]]
        })
        return record
      })

      return Promise.reduce(records, ((total, record) => {
        return base(table_to_sync.airtable_table).create(record)
      }), 0)
    }).then(() => {
      return sts(JSON.stringify([], null, 4))
        .pipe(vss(`${table_to_sync.airtable_table}_new.json`))
        .pipe(gulp.dest(build))
    })
  }))
})
