const assert = require('assert');
const model = require('../model/model');
const config = require('../config');

var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();

model.setConfig(config.gamebattle);

describe('model', function () {
  describe('createUser', function () {
    it('should return user', function () {
      model.createUser({name: "modeltest"}).should.be.fulfilled
        .and.should.eventually
        .have.property("lastID");
    });
  });
/*
  describe('getUser', function () {
    it('should return user', function () {
      model.getUser({name: "modeltest"}).should.be.fulfilled
        .and.should.eventually
        .include({name: "modeltest"});
    });
  });
*/
  describe('getOrCreateUser', function () {
    it('should create and return user', function () {
      model.getOrCreateUser({name: "modeltest2"}).should.be.fulfilled
        .and.should.eventually
        .include({name: "modeltest2"});
    });
    it('should return user', function () {
      model.getOrCreateUser({name: "modeltest2"}).should.be.fulfilled
        .and.should.eventually
        .include({name: "modeltest2"});
    });
  });

});
