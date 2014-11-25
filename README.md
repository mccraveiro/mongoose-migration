mongoose-migration
==================

Install
-------

`npm install -save mongoose-migration`

usage
-----

### Init configuration

`migrate init`

### Create a migration

`migrate create <description>`

Example:
`migrate create "Add createdAt to users collection"`

### Edit Migration File

Open up your migration file (created on the previous step). It should have a default `up` and `down` function.

Example:
```
exports.up = function(next) {
  next();
};

exports.down = function(next) {
  next();
};
```

To load a model you should call `this.model(<model name>)`

Example:
```
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

`migrate`

or

`migrate up <number of migrations to perform>`

### Rollback Migration

`migrate down`

or

`migrate down <number of migrations to rollback>`

### Help

`migrate -h`