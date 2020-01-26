import test from 'ava'
import nock from 'nock'

import headers from './fixtures/headers'
import sports_response from './fixtures/sports'

import { pullTable } from '../src/airtable'

import { auth_key, base_name } from './fixtures/config'

import path from 'path'
import util from 'util'
import fs from 'fs'

const readFile = util.promisify(fs.readFile)

test.beforeEach(async(t) => {
  const primary = "Sports"
  const view = "Main"

  nock('https://api.airtable.com:443', { encodedQueryParams: true })
    .get(`/v0/${base_name}/${primary}`)
    .query({
      view,
      filterByFormula: "Type=Team"
    })
    .reply(200, sports_response, headers)

  await pullTable({
    auth_key,
    base_name,
    flatten: [ "Network" ],
    primary,
    view
  })

  const filename = path.resolve(`${__dirname}/../build/${primary}.json`)
  const file_contents = await readFile(filename)
  t.context.data = JSON.parse(file_contents)
})

test("flatten works correctly", (t) => {
  t.is(t.context.data[0]._id, sports_response.records[0].id)
  t.is(t.context.data[0].Network, "NBC")
})

test("flatten works correctly again", (t) => {
  t.is(t.context.data[1]._id, sports_response.records[1].id)
  t.is(t.context.data[1].Network, "CBS")
})

