import test from 'ava'
import nock from 'nock'

import headers from './fixtures/headers'

import { initialPull, pullTable, pushChangedTable } from '../src/airtable'

import path from 'path'
import util from 'util'
import fs from 'fs'
import yaml from 'yaml'
import mkdirp from 'mkdirp'
import rimraf from 'rimraf'

const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)
const removeFolder = util.promisify(rimraf)

test.beforeEach(async(t) => {
  const output_dirname = path.resolve(`${__dirname}/../build/test_a`)
  await removeFolder(output_dirname)
  await mkdirp(output_dirname)

  let fixtures = {
    s1: 'airtable-original/002_sports.json',
    s2: 'airtable-transformed/004_sports.json',
    s3: 'airtable-transformed/005_sports.json',
    f3: 'airtable-transformed/003_furniture_diff.json',
    config: 'config-yaml/002_sports.yaml'
  }
  let fixture_texts = {}

  for (const name in fixtures) {
    const filepath = fixtures[name]
    const fixture_filename = path.resolve(`${__dirname}/../test/fixtures/${filepath}`)
    fixture_texts[name] = await readFile(fixture_filename, 'utf-8')
    if (filepath.endsWith('json')) fixtures[name] = JSON.parse(fixture_texts[name])
    if (filepath.endsWith('yaml')) fixtures[name] = yaml.parse(fixture_texts[name])
  }

  t.context = {
    fixtures,
    fixture_texts,
    output_dirname,
  }
})


test.serial("run initial pull", async(t) => {
  const { output_dirname, fixtures } = t.context
  const { s1, s2, config } = fixtures

  nock('https://api.airtable.com:443', { encodedQueryParams: true })
    .get(`/v0/app_fake_2/Sports`)
    .query({
      view: "Main",
      filterByFormula: "Type=Team"
    })
    .reply(200, s1, headers)

  await initialPull(config)

  const output_filename = path.resolve(`${output_dirname}/Sports.json`)
  let output_data = await readFile(output_filename, 'utf-8')
  output_data = JSON.parse(output_data)

  t.deepEqual(s2, output_data)
})


test.serial("run pull table directly", async(t) => {
  const { output_dirname, fixtures } = t.context
  const { s1, s3 } = fixtures

  nock('https://api.airtable.com:443', { encodedQueryParams: true })
    .get(`/v0/app_fake_2/Sports`)
    .query({
      view: "Main"
    })
    .reply(200, s1, headers)

  await pullTable({
    auth_key: 'key11111111111111',
    base_name: "app_fake_2",
    primary: "Sports",
    database: "test_a",
    view: "Main"
  })

  const output_filename = path.resolve(`${output_dirname}/Sports.json`)
  let output_data = await readFile(output_filename, 'utf-8')
  output_data = JSON.parse(output_data)

  t.deepEqual(s3, output_data)

})

test.serial("push changed table", async(t) => {
  const { fixture_texts, output_dirname } = t.context
  const { f3 } = fixture_texts

  const diff_filename =  path.resolve(`${output_dirname}/Furniture_diff.json`)
  await writeFile(diff_filename, f3, 'utf-8')

  nock('https://api.airtable.com:443', { encodedQueryParams: true})
    .patch('/v0/app_fake_2/Furniture/', {
      records: [{
        id: "recFurn0",
        fields: {
          Material: "Wool"
        }
      }]
    })
    .query({})
    .reply(200, {
      records: [{
        id: "recFurn0",
        fields: {
          Id: "furn-000",
          Name: "Old couch in the living room",
          Owner: [ "Jack" ],
          Type: "Couch",
          Material: "Wool"
        },
        createdTime:"2020-01-05T09:46:07.000Z"
      }]
    }, headers)
  ;

  await pushChangedTable({
    auth_key: 'key1',
    base_name: "app_fake_2",
    primary: "Furniture",
    database: "test_a",
  })

  let output_data = await readFile(diff_filename, 'utf-8')
  output_data = JSON.parse(output_data)

  t.deepEqual([], output_data.modified)

})

  //.reply(422, {"error":{"type":"ROW_DOES_NOT_EXIST","message":"Record ID recsIivpi4vU7zfoB does not exist in this table"}}
