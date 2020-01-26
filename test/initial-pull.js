import test from 'ava'
import nock from 'nock'

import headers from './fixtures/headers'

import { initialPull } from '../src/airtable'

import path from 'path'
import util from 'util'
import fs from 'fs'
import yaml from 'yaml'

const readFile = util.promisify(fs.readFile)

test("run function correctly", async(t) => {

  const filename = path.resolve(`${__dirname}/../test/fixtures/config.yaml`)
  let config = await readFile(filename, 'utf-8')
  config = yaml.parse(config)
  
  for (const { base_name, primary, view, filter, collection } of config.sync) {
    const fixture_filename = path.resolve(`${__dirname}/../test/fixtures/${collection}.json`)
    let fixture_data = await readFile(fixture_filename, 'utf-8')
    fixture_data = JSON.parse(fixture_data)

    nock('https://api.airtable.com:443', { encodedQueryParams: true })
      .get(`/v0/${base_name}/${primary}`)
      .query({
        view,
        ...filter && { filterByFormula: filter }
      })
      .reply(200, fixture_data, headers)
  }

  await initialPull(filename)

  for (const { primary, collection } of config.sync) {
    const fixture_filename = path.resolve(`${__dirname}/../test/fixtures/${collection}.json`)
    let fixture_data = await readFile(fixture_filename, 'utf-8')
    fixture_data = JSON.parse(fixture_data)

    const output_filename  = path.resolve(`${__dirname}/../build/${primary}.json`)
    let output_data = await readFile(output_filename, 'utf-8')
    output_data = JSON.parse(output_data)

    t.is(fixture_data.records[0].id, output_data[0].__id)

    if (fixture_data.records[0].Name) {
      t.is(fixture_data.records[0].fields.Name, output_data[0].Name)
    }
  }
})
