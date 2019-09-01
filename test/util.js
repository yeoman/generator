'use strict';

const path = require('path');
const assert = require('assert');
const { isBinary } = require('../lib/util/binary-diff');
const fs = require('fs');

describe('util', () => {
  it('regular file that contains ut8 chars is not binary file', done => {
    const filePath = path.join(__dirname, 'fixtures/file-contains-utf8.yml');
    fs.readFile(filePath, { encoding: 'utf8' }, (err, data) => {
      if (err) return done(err);
      assert.equal(isBinary(filePath, data), false);
      done();
    });
  });
});
