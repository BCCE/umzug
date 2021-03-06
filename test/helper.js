import _ from 'lodash';
import fs from 'fs';
import {join} from 'path';

const helper = module.exports = {
  clearTmp (path) {
    let tmpPath = join(__dirname, '/tmp');
    path = path || tmpPath;
    let files = fs.readdirSync(path);

    files.forEach((file) => {
      let filePath = join(path, '/' + file);
      if (file.match(/\.(js|json|sqlite|coffee)$/)) {
        fs.unlinkSync(filePath);
      } else if (fs.lstatSync(filePath).isDirectory()) {
        helper.clearTmp(filePath);
      }
    });
    if (path !== tmpPath) {
      fs.rmdirSync(path);
    }
  },

  generateDummyMigration: function (name, subDirectories) {
    let path = join(__dirname, '/tmp/');
    if (subDirectories) {
      if (!_.isArray(subDirectories)) {
        subDirectories = [subDirectories];
      }
      subDirectories.forEach((directory) => {
        path = join(path, directory + '/');
        if (!fs.existsSync(path)) {
          fs.mkdirSync(path);
        }
      });
    }
    fs.writeFileSync(
      join(path, name + '.js'),
      [
        '\'use strict\';',
        '',
        'module.exports = {',
        '  up: function () {},',
        '  down: function () {}',
        '};',
      ].join('\n')
    );

    return name;
  },

  prepareMigrations (count, options) {
    options = {
      names: [],
      directories: [], // can be array of strings or array of array of strings
      // example 1: ['foo','bar'] ==> generates /foo and /bar
      // example 2: [['foo','bar'],['foo','bar2']] ==> generates /foo/bar and /foo/bar2
      // example 3: ['foo',['foo','bar2']] ==> generates /foo and /foo/bar2
      ...options || {},
    };

    return new Promise((resolve) => {
      let names = options.names;
      let num = 0;

      helper.clearTmp();

      _.times(count, (i) => {
        num++;
        names.push(options.names[i] || (num + '-migration'));
        helper.generateDummyMigration(names[i], options.directories[i]);
      });

      resolve(names);
    });
  },

  wrapStorageAsCustomThenable (storage) {
    return {
      logMigration (migration) {
        return helper._convertPromiseToThenable(storage.logMigration(migration));
      },
      unlogMigration (migration) {
        return helper._convertPromiseToThenable(storage.unlogMigration(migration));
      },
      executed () {
        return helper._convertPromiseToThenable(storage.executed());
      },
    };
  },

  _convertPromiseToThenable (promise) {
    return {
      then (onFulfilled, onRejected) {
        // note don't return anything!
        promise.then(onFulfilled, onRejected);
      },
    };
  },

  promisify (fn) {
    return (...args) => {
      return new Promise((resolve, reject) => {
        fn(...args, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    };
  },
};
