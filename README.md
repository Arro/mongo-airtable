Mongo Airtable
=============

Motivation
----------
Airtable is great database/spreadsheet hybrid for holding your data.  The
problem is that sometimes you don't have internet access, so pulling and
saving data using their API isn't feasible.  This tool allows you to
get and set your data to a MongoDB database, whether or not you have
internet access, and then sync whenever is convenient.  That way, Airtable
is still your ultimate source of truth, but your app's proxy source of
truth is MongoDB.

Getting started
----------
Install MongoDB using `brew install mongodb` or similar. 

Let's say you wanted your mongodb database to be called "main" and your
collection (which maps to a table in Airtable) to be called "songs".  The
Airtable view is called "Main View".

Run `mongo` and type:

    use main

Then type:

    db.createCollection('songs')

Clone this repo, and then create a file called `config.yaml`.  Make it
look like the following.

    config:
      auth:
        airtable: <your airtable api key (starts with 'keyn')>
      sync:
        - airtable_base: <your airtable base key (starts with 'app')>
          airtable_table: <your airtable table name (e.g. 'Songs')>
          airtable_view: <your airtable view name (e.g. 'Main View')>
          mongo_database: <a mongo db name (e.g. 'main')>
          mongo_collection: <a mongo db collection name (e.g. 'songs')>

Run `yarn install` (or `npm install`) and then

    gulp init

This will load your records into the appropriate mongodb collections.

This is currently a work in progress.
-------------------------------------


