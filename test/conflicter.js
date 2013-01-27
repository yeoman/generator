/*global describe, before, it */
var fs = require('fs');
var events = require('events');
var assert = require('assert');
var conflicter = require('../lib/util/conflicter');


describe('conflicter', function () {
  beforeEach(conflicter.reset.bind(conflicter));

  conflicter.on('conflict', function () {
    process.nextTick(function () {
      process.stdin.write('Y\n');
      process.stdin.emit('data', 'Y\n');
    });
  });

  it('is an event emitter', function () {
    assert.ok(conflicter instanceof events.EventEmitter);
  });

  it('conflicter#colors', function () {
    assert.deepEqual(conflicter.colors, {
      'diff added': 42,
      'diff removed': 41
    });
  });

  it('conflicter#add(conflict)`', function () {
    conflicter.add(__filename);
    var conflict = conflicter.conflicts.pop();
    assert.deepEqual(conflict.file, __filename);
    assert.deepEqual(conflict.content, fs.readFileSync(__filename, 'utf8'));
  });

  describe('conflicter#resolve(cb)', function (done) {
    it('wihout conflict', function (done) {
      conflicter.resolve(done);
    });

    it('with at least one', function (done) {
      conflicter.add(__filename);
      conflicter.add({
        file: 'foo.js',
        content: 'var foo = "foo";\n'
      });

      conflicter.resolve(done);
    });
  });


  describe.skip('conflicter#collision(filepath, content, cb)', function (done) {
    var me = fs.readFileSync(__filename, 'utf8');
    it('identical status', function(done) {
      conflicter.collision(__filename, me, function (err, status) {
        assert.equal(status, 'identical');
        done();
      });
    });

    it('create status', function (done) {
      conflicter.collision('foo.js', '', function (err, status) {
        assert.equal(status, 'create');
        done();
      });
    });

    it('conflict status', function (done) {
      conflicter.collision(__filename, '', function (err, status) {
        assert.equal(status, 'force');
        done();
      });
    });
  });

  it('conflicter#diff(actual, expected)', function () {
    var diff = conflicter.diff('var', 'let');
    assert.equal(diff, '\n\u001b[41mremoved\u001b[0m \u001b[42madded\u001b[0m\n\n\u001b[42mlet\u001b[0m\u001b[41mvar\u001b[0m\n');
  });
});
