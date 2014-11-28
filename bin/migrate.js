#! /usr/bin/env node

'use strict';

var program = require('commander');
var prompt = require('prompt');
var colors = require('colors/safe');
var slug = require('slug');
var path = require('path');
var fs = require('fs');

var config_filename = '.migrate.json';
var config_path = process.cwd() + '/' + config_filename;
var CONFIG;

program
  .command('init')
  .description('Init migrations on current path')
  .action(init);

program
  .command('create <description>')
  .description('Create Migration')
  .action(createMigration);

program
  .command('down [number_of_migrations] (default = 1)')
  .description('Migrate down')
  .action(migrate.bind(null, 'down', process.exit));

program
  .command('up [number_of_migrations]')
  .description('Migrate up (default command)')
  .action(migrate.bind(null, 'up', process.exit));

program.version(require('../package.json').version);
program.parse(process.argv);

// Default command ?
if (program.rawArgs.length < 3) {
  migrate('up', process.exit, Number.POSITIVE_INFINITY);
}

/*
 *  Helpers
 */

function error(msg) {
  console.error(colors.red(msg));
  process.exit(1);
}

function success(msg) {
  console.log(colors.green(msg));
}

function loadConfiguration() {
  try {
    return require(config_path);
  } catch (e) {
    error('Missing ' + config_filename + ' file. Type `migrate init` to create.');
  }
}

function updateTimestamp(timestamp, cb) {
  CONFIG.current_timestamp = timestamp;
  var data = JSON.stringify(CONFIG, null, 2);
  fs.writeFile(config_path, data, cb);
}

function init() {
  if (fs.existsSync(config_path)) {
    error(config_filename + ' already exists!');
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

    success(config_filename + ' file created!\nEdit it to include your models definitions');
    process.exit();
  });
}

function createMigration(description) {

  CONFIG = loadConfiguration();

  var timestamp = Date.now();
  var migrationName = timestamp + '-' + slug(description) + '.js';
  var template = path.normalize(__dirname + '/../template/migration.js');
  var filename = path.normalize(CONFIG.basepath + '/' + migrationName);

  // create migrations directory
  if (!fs.existsSync(CONFIG.basepath)){
    fs.mkdirSync(CONFIG.basepath);
  }

  var data = fs.readFileSync(template);
  fs.writeFileSync(filename, data);
  success('Created migration ' + migrationName);
  process.exit();
}

function connnectDB() {
  // load local app mongoose instance
  var mongoose = require(process.cwd() + '/node_modules/mongoose');
  mongoose.connect(CONFIG.connection);
  // mongoose.set('debug', true);
}

function loadModel(model_name) {
  return require(process.cwd() + '/' + CONFIG.models[model_name]);
}

function getTimestamp(name) {
  return parseInt((name.split('-'))[0]);
}

function migrate(direction, cb, number_of_migrations) {

  CONFIG = loadConfiguration();

  if (!number_of_migrations) {
    number_of_migrations = 1;
  }

  if (direction == 'down') {
    number_of_migrations = -1 * number_of_migrations;
  }

  var migrations = fs.readdirSync(CONFIG.basepath);

  connnectDB();

  migrations = migrations.filter(function (migration_name) {
    var timestamp = getTimestamp(migration_name);

    if (number_of_migrations > 0) {
      return timestamp > CONFIG.current_timestamp;
    } else if (number_of_migrations < 0) {
      return timestamp <= CONFIG.current_timestamp;
    }
  });

  loopMigrations(number_of_migrations, migrations, cb);
}

function loopMigrations(direction, migrations, cb) {

  if (direction == 0 || migrations.length == 0) {
    return cb();
  }

  if (direction > 0) {
    applyMigration('up', migrations.shift(), function () {
      direction--;
      loopMigrations(direction, migrations, cb);
    });
  } else if (direction < 0) {
    applyMigration('down', migrations.pop(), function () {
      direction++;
      loopMigrations(direction, migrations, cb);
    });
  }
}

function applyMigration(direction, name, cb) {
  var migration = require(process.cwd() + '/' + CONFIG.basepath + '/' + name);
  var timestamp = getTimestamp(name);

  success('Applying migration ' + name + ' - ' + direction);
  migration[direction].call({
    model: loadModel
  }, callback);

  function callback() {

    if (direction == 'down') {
      timestamp--;
    }

    updateTimestamp(timestamp, cb);
  }
}