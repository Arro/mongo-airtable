import test from 'ava'
import nock from 'nock'

import headers from './fixtures/headers'
import songs_response from './fixtures/songs'

import { pullTable } from '../src/airtable'

import { auth_key, base_name } from './fixtures/config'

test("can pull correctly", async(t) => {
  nock('https://api.airtable.com:443', { encodedQueryParams: true })
    .get(`/v0/${base_name}/Songs`)
    .query({ view: "Main" })
    .reply(200, songs_response, headers)

  t.context.songs = await pullTable({
    auth_key,
    base_name,
    primary: "Songs",
    view: "Main",
  })

  t.pass()


})
