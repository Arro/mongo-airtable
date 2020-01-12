import test from 'ava'
import nock from 'nock'

import headers from './fixtures/headers'
import songs_response from './fixtures/songs'

import { pullTable } from '../src/airtable'

import { auth_key, base_name } from './fixtures/config'

import path from 'path'
import util from 'util'
import fs from 'fs'

const readFile = util.promisify(fs.readFile)

test.beforeEach(async(t) => {
  const primary = "Songs1"
  const view = "Main"

  nock('https://api.airtable.com:443', { encodedQueryParams: true })
    .get(`/v0/${base_name}/${primary}`)
    .query({ view })
    .reply(200, songs_response, headers)

  await pullTable({
    auth_key,
    base_name,
    primary,
    view
  })

  const filename = path.resolve(`${__dirname}/../build/${primary}.json`)
  const file_contents = await readFile(filename)
  t.context.data = JSON.parse(file_contents)
})

test("ids pull correctly", (t) => {
  t.is(t.context.data[0].__id, songs_response.records[0].id)
  t.is(t.context.data[1].__id, songs_response.records[1].id)
  t.is(t.context.data[2].__id, songs_response.records[2].id)
})

test("fields pull correctly", (t) => {
  t.is(t.context.data[0].URL, songs_response.records[0].fields.URL)
  t.is(t.context.data[1].URL, songs_response.records[1].fields.URL)
  t.is(t.context.data[2].URL, songs_response.records[2].fields.URL)
})

test("right number of records", (t) => {
  t.is(t.context.data.length, songs_response.records.length)
})
