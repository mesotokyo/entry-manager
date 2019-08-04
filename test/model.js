const assert = require('assert');
const model = require('../model/model');

var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();

describe('model', function () {
  describe('getOrCreateUser', function () {
    it('should create and return user', function () {
      model.getOrCreateUser({name: "modeltest"}).should.be.fulfilled
        .and.should.eventually
        .include({name: "modeltest"});
    });
    it('should return user', function () {
      model.getOrCreateUser({name: "modeltest"}).should.be.fulfilled
        .and.should.eventually
        .include({name: "modeltest"});
    });
  });
});
