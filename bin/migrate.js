#! /usr/bin/env node

var program = require('commander');
var prompt = require('prompt');
var colors = require('colors');
var slug = require('slug');
var fs = require('fs');

var config_filename = '.migrate.json';
var config_path = process.cwd() + '/' + config_filename;
var CONFIG;

program
  .option('init', 'Init migrations on current path')
  .option('create [description]', 'Create Migration')
  .option('down', 'Migrate down')
  .option('up', 'Migrate up')
  .parse(process.argv);

// migrate init
if (program.init) {
  init();
  process.exit();
}

CONFIG = loadConfig();

// migrate create
if (program.create) {
  if (program.create === true) {
    console.error('Missing migration description'.red);
    process.exit(1);
  }
  createMigration(program.create);
  process.exit();
}
// migrate down
else if (program.down) {
  migrate(-1, function () {
    process.exit();
  });
}
// migrate up
else if (program.up) {
  migrate(1, function () {
    process.exit();
  });
}
// otherwise show help message
else {
  program.help();
}

function loadConfig() {
  try {
    return require(config_path);
  } catch (e) {
    console.error(('Missing ' + config_filename + ' file. Type `migrate init` to create.').red);
    process.exit(1);
  }
}

function updateTimestamp(timestamp) {
  CONFIG.current_timestamp = timestamp;
  var data = JSON.stringify(CONFIG, null, 2);
  fs.writeFileSync(config_path, data);
}

function init() {
  if (fs.existsSync(config_path)) {
    console.error((config_filename + ' already exists!').red);
    process.exit(1);
  }

  var schema = {
    properties: {
      basepath: {
        description: 'Enter migrations directory',
        type: 'string',
        default: 'migrations'
      },
      connection: {
        description: 'Enter mongo connection string',
        type: 'string',
        required: true
      }
    }
  };

  prompt.start();
  prompt.get(schema, function (error, result) {
    CONFIG = {
      basepath: result.basepath,
      connection: result.connection,
      current_timestamp: 0,
      models: {}
    };

    var data = JSON.stringify(CONFIG, null, 2);
    fs.writeFileSync(config_path, data);

    console.log((config_filename + ' file created!').green);
    console.log('Edit it to include your models definitions'.green);
  });
}

function createMigration(description) {
  var timestamp = Date.now();
  var description = slug(description);
  var filename = timestamp + '-' + description + '.js';

  // create migrations directory
  if (!fs.existsSync(CONFIG.basepath)){
    fs.mkdirSync(CONFIG.basepath);
  }

  fs.createReadStream(__dirname + '/../template/migration.js')
    .pipe(fs.createWriteStream(CONFIG.basepath + '/' + filename));

  console.log('Created migration', filename);
}

function connnectDB() {
  // load local app mongoose instance
  var mongoose = require(process.cwd() + '/node_modules/mongoose');

  mongoose.connect(CONFIG.connection);
  mongoose.set('debug', true);
}

function loadModel(model_name) {
  return require(process.cwd() + '/' + CONFIG.models[model_name]);
}

function migrate(direction, cb) {
  var migrations = fs.readdirSync(CONFIG.basepath);

  connnectDB();

  if (direction > 0) {
    migrations = migrations.filter(function (migration_name) {
      var timestamp = parseInt((migration_name.split('-'))[0]);
      return timestamp > CONFIG.current_timestamp;
    });
  } else if (direction < 0) {
    migrations = migrations.filter(function (migration_name) {
      var timestamp = parseInt((migration_name.split('-'))[0]);
      return timestamp <= CONFIG.current_timestamp;
    });
  }

  loopmigrations(direction, migrations, cb);
}

function loopmigrations(direction, migrations, cb) {
  if (direction > 0 && migrations.length !== 0) {
    apply_migration('up', migrations.shift(), function () {
      direction--;
      loopmigrations(direction, migrations, cb);
    });
  } else if (direction < 0 && migrations.length !== 0) {
    apply_migration('down', migrations.pop(), function () {
      direction++;
      loopmigrations(direction, migrations, cb);
    });
  } else {
    cb();
  }
}

function apply_migration(direction, name, cb) {
  var migration = require(process.cwd() + '/' + CONFIG.basepath + '/' + name);
  var timestamp = parseInt((name.split('-'))[0]);

  console.log(('Applying migration ' + name + ' - ' + direction).yellow);
  migration[direction].call({
    model: loadModel
  }, callback);

  function callback() {

    if (direction == 'down') {
      timestamp--;
    }

    updateTimestamp(timestamp);
    cb();
  }
}