const assert = require('assert');
const http = require('http');

var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();

const host = "localhost";
const port = "3000";

function jsonRequest(path, postData, callback) {
  const opt = {
    path: path,
    host: host,
    port: port,
    method: "POST",
    headers: {
      'Content-Type': 'application/json',
    },
  };
  json = JSON.stringify(postData);
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
        reference: "ほげほげ",
        url: "http://example.com",
        comment: "テストのコメント",
        author: "ほげ",
        parts: ["foo1", "bar2", "hoge3"]
      },
    };
    return jsonRequest("/api/", data).should.be.fulfilled
      .and.should.eventually
      .have.property('result')
      .have.property('song')
      .include({title: data.params.title,
                url: data.params.url,
                comment: data.params.comment,
                reference: data.params.reference,
               })
      .have.property('song_id').with.not.equal(0);
  });

  it('should fail when create duplicated entry', function () {
    const data = {
      method: "createSong",
      params: {
        title: "テストタイトル",
        reference: "ほげほげ",
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
        reference: "ほげほげ2",
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
        reference: "ほげほげ2",
        url: "http://example.com/foo",
        comment: "テストのコメント3",
        author: "ほげほげ",
        parts: ["foo1", "bar2", "hoge3"]
      },
    };
    return jsonRequest("/api/", data).should.be.fulfilled;
  });
});

describe('listSongs', function () {
  it('should return result', function () {
    const data = {
      method: "listSongs",
    };
    return jsonRequest("/api/", data).should.be.fulfilled
      .and.should.eventually
      .have.property('result')
      .with.have.property('songs')
      .with.have.property('0').with.have.property('parts')
      .with.have.lengthOf.at.least(1);
  });
});

describe('entry', function () {
  it('should return result', function () {
    const data = {
      method: "entry",
      params: {
        song_id: 1,
        part_id: 1,
        name: "ほげほげ"
      },
    };
    return jsonRequest("/api/", data).should.be.fulfilled
      .and.should.eventually
      .have.property('result')
      .with.have.property('entry')
      .have.all.keys("entry_id",
                     "song_id",
                     "user_id",
                     "part_id");
  });
});

