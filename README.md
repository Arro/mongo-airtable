Mongo Airtable
=============

A note
------
As of February 2020, this is under active development.  You may wish to wait a bit before using it. 

**If you make conflicting changes, one will overwrite the other.  Use this tool at your own risk!** 

Motivation
----------
Airtable is great database/spreadsheet hybrid for holding your data.  The problem is that sometimes you don't have internet access, so pulling and saving data using their API isn't feasible.  This tool allows you to get and set your data to a MongoDB database, whether or not you have internet access, and then sync whenever is convenient.  That way, Airtable is still your ultimate source of truth, but your app's proxy source of truth is MongoDB.

Getting started
----------
Install MongoDB using `brew install mongodb` or similar. 

Let's say you wanted your mongodb database to be called "main" and your collection (which maps to a table in Airtable) to be called "songs".  The Airtable view is called "Main View".

Clone this repo, and then create a file called `~/.mongo-airtable.yaml`.  Make it look like the following.

    auth:
      airtable: <your airtable api key (starts with 'key')>
    sync:
      - base_name: <your airtable base key (starts with 'app')>
        primary: <your airtable table name (e.g. 'Songs')>
        view: <your airtable view name (e.g. 'Main View')>
        database: <a mongo db name (e.g. 'main')>
        collection: <a mongo db collection name (e.g. 'songs')>
      - base_name: <your airtable base key (starts with 'app')>
        primary: <another airtable table name (e.g. 'Artists')>
        view: <your airtable view name (e.g. 'Main View')>
        database: <another mongo db name (e.g. 'main')>
        collection: <another mongo db collection name (e.g. 'songs')>

Run `npm install` (or `yarn install`).  Now you're mostly ready to go.

Run the tests by doing `npm test`.  This is important, as it acts as diagnostics for your local setup. 

When you want to pull from airtable down to your mongodb collection, run: 

    npm run pull

###TODO: 

- [ ] document how to push
- [ ] make this tool use the "modified date" on airtable records 
- [ ] make this tool use the "modified date" of mongo records
- [ ] progress bars 
- [ ] confirmation dialogues for conflicts 
- [ ] 100% test coverage after the above are complete



