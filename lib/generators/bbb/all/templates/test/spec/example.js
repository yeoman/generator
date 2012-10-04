define([

  // import the module to be tested
  '../../app/scripts/app'

], function(module) {
  'use strict';

  describe("module", function() {
    it("has trigger method", function() {
      expect(module.trigger).to.be.a("function")
    });
  });

  describe("one tautology", function() {
    it("is a tautology", function() {
      expect(true).to.be.true;
    });

    describe("is awesome", function() {
      it("is awesome", function() {
        expect(1).to.equal(1);
      });
    });
  });

  describe("simple tests", function() {
    it("increments", function() {
      var mike = 0;

      expect(mike++ === 0).to.be.true;
      expect(mike === 1).to.be.true;
    });

    it("increments (improved)", function() {
      var mike = 0;

      expect(mike++).to.equal(0);
      expect(mike).to.equal(1);
    });
  });

  describe("setUp/tearDown", function() {
    beforeEach(function() {
      // console.log("Before");
    });

    afterEach(function() {
      // console.log("After");
    });

    it("example", function() {
      // console.log("During");
    });

    describe("setUp/tearDown", function() {
      beforeEach(function() {
        // console.log("Before2");
      });

      afterEach(function() {
        // console.log("After2");
      });

      it("example", function() {
        // console.log("During Nested");
      });
    });
  });

  describe("async", function() {
    it("multiple async", function(done) {
      var semaphore = 2;

      setTimeout(function() {
        expect(true).to.be.true;
        semaphore--;
      }, 500);

      setTimeout(function() {
        expect(true).to.be.true;
        semaphore--;
      }, 500);

      setTimeout(function() {
        expect(semaphore).to.equal(0);
        done();
      }, 600);
    });
  });
});
