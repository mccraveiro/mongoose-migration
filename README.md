mongoose-migration
==================

Data migration tool for Mongoose

## Installation

Run the following command to install it:

```console
npm install mongoose-migration --save
```

## Usage

### Init configuration

The following command should be executed a single time on the project root directory. It will create the `.migrate.json` configuration file.

```console
migrate init
```

After creating it you need to edit and add the path to your models.

Example:
```json
{
  "basepath": "migrations",
  "connection": "mongodb://localhost/db",
  "current_timestamp": 0,
  "models": {
    "User": "models/user.js"
  }
}
```

Note that on the previous example `models/user.js` is the model definition file. This file should exports the mongoose model definition.

`model/users.js` example:
```javascript
...
module.exports = mongoose.model('User', schema);
```

### Create a migration

```console
migrate create <description>
```

Example:
```console
migrate create "Add createdAt field to users collection"
```

### Edit Migration File

Open up your migration file (created on the previous step). It should have a default `up` and `down` function.

Example:
```javascript
exports.up = function(next) {
  next();
};

exports.down = function(next) {
  next();
};
```

Note: To load a mongoose model defined on your configuration file you should call `this.model(<model name>)`

Example:
```javascript
exports.up = function(next) {
  this
    .model('User')
    .update(
      {},
      {
        $set: { createdAt: Date.now() }
      },
      {
        multi: true,
        strict: false
      },
      function (error, numberAffected, raw) {
        if (error) {
          console.error(error);
        }
        console.log('The number of updated documents was %d', numberAffected);
        console.log('The raw response from Mongo was ', raw);
        next();
      }
    );
};

exports.down = function(next) {
  this
    .model('User')
    .update(
      {},
      {
        $unset: { createdAt: 1 }
      },
      {
        multi: true,
        strict: false
      },
      function (error, numberAffected, raw) {
        if (error) {
          console.error(error);
        }
        console.log('The number of updated documents was %d', numberAffected);
        console.log('The raw response from Mongo was ', raw);
        next();
      }
    );
};
```

### Perform Migration

```console
migrate
```
or
```console
migrate up [number of migrations to perform]
```

Note: By default `migrate` will execute all migrations created until now. However `migrate up` will only execute one migration.

### Rollback Migration

```console
migrate down
```
or
```console
migrate down [number of migrations to rollback]
```

### Help

```console
migrate -h
```

## Todo

- Add environments (dev, production) on the configuration file
- Add `migrate to [timestamp]`
- Add tests

# Contributing

For contributing, [open an issue](https://github.com/mccraveiro/mongoose-migration/issues) and/or a [pull request](https://github.com/mccraveiro/mongoose-migration/pulls).

## License

The MIT License (MIT)

Copyright (c) 2014 mccraveiro

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.