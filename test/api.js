const assert = require('assert');
const http = require('http');
const config = require('../config');

var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();

const host = "localhost";
const port = "3000";

function jsonRequest(path, params, callback) {
  const opt = {
    path: path,
    host: host,
    port: port,
    method: "POST",
    headers: {
      'Content-Type': 'application/json',
    },
  };
  const postData = Object.assign(params);
  postData.params.token = config.token;
  const json = JSON.stringify(postData);
  return new Promise((resolve, reject) => {
    const req = http.request(opt, (res) => {
      var data = "";
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let result;
        // console.error(data);
        try {
          result = JSON.parse(data);
        }
        catch (err) {
          reject(err + "data: " + data);
          return;
        }
        if (result.error) {
          reject(result.error.message || result.error.code);
        } else {
          resolve(result);
        }
      });
    });
    req.on('error', (err) => { reject("onError: " + err); });
    req.write(json);
    req.end();
  });
}

describe('createSong', function () {
  it('should return result', function () {
    const data = {
      method: "createSong",
      params: {
        title: "テストタイトル",
        reference: "出典の名前",
        url: "http://example.com",
        comment: "テストのコメント",
        author: "ほげ",
        parts: ["ボーカル", "ギター", "ドラム"]
      },
    };
    return jsonRequest("/api/", data).should.be.fulfilled
      .and.should.eventually
      .have.property('result')
      .have.property('song')
      .include({title: data.params.title,
                reference: data.params.reference,
                url: data.params.url,
                comment: data.params.comment,
                author: data.params.author
               })
      .have.property('song_id').with.not.equal(0);
  });

  it('should fail when create duplicated entry', function () {
    const data = {
      method: "createSong",
      params: {
        title: "テストタイトル",
        reference: "出典の名前",
        url: "http://example.com/foo",
        comment: "テストのコメント2",
        author: "ほげほげ",
        parts: ["foo1",]
      },
    };
    return jsonRequest("/api/", data).should.be.rejected;
  });

  it('should fail when create invalid URL', function () {
    const data = {
      method: "createSong",
      params: {
        title: "テストタイトル",
        reference: "違う出典",
        url: "script>foo",
        comment: "テストのコメント2",
        author: "ほげほげ",
        parts: ["foo1",]
      },
    };
    return jsonRequest("/api/", data).should.be.rejected;
  });

  it('should ok when create duplicated title', function () {
    const data = {
      method: "createSong",
      params: {
        title: "テストタイトル",
        reference: "違う出典",
        url: "http://example.com/foo",
        comment: "テストのコメント3",
        author: "ほげほげ",
        parts: ["ボーカル",]
      },
    };
    return jsonRequest("/api/", data).should.be.fulfilled;
  });
});

describe('updateSong', function () {
  it('should succeeds', function () {
    const data = {
      method: "updateSong",
      params: {
        song_id: 1,
        name: "更新後のタイトル",
        reference: "出典2",
        url: "http://example.com/foo",
        comment: "更新後のコメント"
      },
    };
    return jsonRequest("/api/", data).should.be.fulfilled
      .and.should.eventually
      .have.property('result')
      .with.have.property('changes')
      .equal(1);
  });

  it('should succeed but no changes when duplicate values', function () {
    const data = {
      method: "updateSong",
      params: {
        song_id: 2,
        reference: "出典の名前",
      },
    };
    return jsonRequest("/api/", data).should.be.rejected
      .and.should.eventually
      .have.property('error')
      .with.have.property('message')
      .equal("duplicated_name");
  });
});

describe('entry', function () {
  it('should return result', function () {
    const data = {
      method: "createEntry",
      params: {
        part_id: 1,
        name: "ほげほげ"
      },
    };
    return jsonRequest("/api/", data).should.be.fulfilled
      .and.should.eventually
      .have.property('result')
      .with.have.property('entry')
      .have.all.keys("song_id",
                     "user_id",
                     "part_id");
  });
  it('should fail when entry to entried part', function () {
    const data = {
      method: "createEntry",
      params: {
        part_id: 1,
        name: "もげもげ"
      },
    };
    return jsonRequest("/api/", data).should.be.rejected;
  });
  it('should return result with instrument name', function () {
    const data = {
      method: "createEntry",
      params: {
        part_id: 2,
        name: "ほげほげ",
        instrument_name: "楽器"
      },
    };
    return jsonRequest("/api/", data).should.be.fulfilled
      .and.should.eventually
      .have.property('result')
      .with.have.property('entry')
      .have.all.keys("song_id",
                     "user_id",
                     "part_id",
                     "instrument_name")
      .include({instrument_name: "楽器"});
  });
  it('should fail when entry to invalid part', function () {
    const data = {
      method: "createEntry",
      params: {
        part_id: 10,
        name: "ほげほげ",
      },
    };
    return jsonRequest("/api/", data).should.be.rejected;
  });
});

describe('deleteEntry', function () {
  it('should succeed', function () {
    const data = {
      method: "deleteEntry",
      params: {
        part_id: 3,
      },
    };
    return jsonRequest("/api/", data).should.be.fulfilled
      .and.should.eventually
      .have.property('result')
      .with.have.property('changes')
      .equal(1);
  });
  it('should fail when the part already entried', function () {
    const data = {
      method: "deleteEntry",
      params: {
        part_id: 2,
      },
    };
    return jsonRequest("/api/", data).should.be.rejected;
  });
});

describe('listSongs', function () {
  it('should return result', function () {
    const data = {
      method: "listSongs",
      params: {},
    };
    return jsonRequest("/api/", data).should.be.fulfilled
      .and.should.eventually
      .have.property('result')
      .with.have.property('songs')
      .with.have.property('0').with.have.property('parts')
      .with.have.property('1')
      .include({song_id: 1,
                part_id: 2,
                name: "ギター",
                entry_name: "ほげほげ",
                instrument_name: "楽器"});
  });
});
