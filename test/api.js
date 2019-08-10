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
        //console.log(data);
        try {
          result = JSON.parse(data);
        }
        catch (err) {
          reject(err + "data: " + data);
          return;
        }
        if (result.error) {
          if (result.error.message) {
            reject(result.error.message);
          }
          reject(result.error);
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
        parts: ["ボーカル", "ギター", "ドラム", "アレ"]
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
        title: "更新後のタイトル",
        reference: "出典2",
        url: "http://example.com/foo",
        comment: "更新後のコメント"
      },
    };
    return jsonRequest("/api/", data).should.be.fulfilled
      .and.should.eventually
      .have.property('result')
      .with.have.property('song')
      .include({title: data.params.title,
                reference: data.params.reference,
                url: data.params.url,
                comment: data.params.comment,
               });
  });

  it('should succeed but no changes when duplicate values', function () {
    const data = {
      method: "updateSong",
      params: {
        song_id: 2,
        title: "更新後のタイトル",
        reference: "出典2",
      },
    };
    return jsonRequest("/api/", data).should.be.rejected
      .and.should.eventually
      .equal("constraint_violation");
  });

});


describe('createEntry', function () {
  it('should return result', function () {
    const data = {
      method: "createEntry",
      params: {
        part_id: 2,
        name: "ほげほげ名",
        instrument_name: "エントリー楽器",
      },
    };
    return jsonRequest("/api/", data).should.be.fulfilled
      .and.should.eventually
      .have.property('result')
      .with.have.property('part')
      .include({part_id: data.params.part_id,
                instrument_name: data.params.instrument_name});
  });
  it('should fail when entry to entried part', function () {
    const data = {
      method: "createEntry",
      params: {
        part_id: 2,
        name: "もげもげ名",
      },
    };
    return jsonRequest("/api/", data).should.be.rejected;
  });
  it('should return result with instrument name', function () {
    const data = {
      method: "createEntry",
      params: {
        part_id: 3,
        name: "ほげほげ名",
        instrument_name: "楽器"
      },
    };
    return jsonRequest("/api/", data).should.be.fulfilled
      .and.should.eventually
      .have.property('result')
      .with.have.property('part')
      .include({ part_id: data.params.part_id,
                 instrument_name: data.params.instrument_name });
  });
  it('should fail when entry to invalid part', function () {
    const data = {
      method: "createEntry",
      params: {
        part_id: 10,
        name: "ほげほげ名",
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
        part_id: 2,
      },
    };
    return jsonRequest("/api/", data).should.be.fulfilled
      .and.should.eventually
      .have.property('result')
      .with.have.property('part')
      .include({ part_id: data.params.part_id });
  });
  it('should fail when the part has no entry', function () {
    const data = {
      method: "deleteEntry",
      params: {
        part_id: 4,
      },
    };
    return jsonRequest("/api/", data).should.be.rejected;
  });
});

describe('getSongs', function () {
  it('should return result', function () {
    const data = {
      method: "getSongs",
      params: {},
    };
    return jsonRequest("/api/", data).should.be.fulfilled
      .and.should.eventually
      .have.property('result')
      .with.have.property('songs')
      .with.have.property('0')
      .with.have.property('parts')
      .with.have.property('1');
  });
});

describe('createComment', function () {
  it('should return result', function () {
    const data = {
      method: "createComment",
      params: {
        song_id: 1,
        author: "ほげほげ名",
        comment: "コメントaaa",
      },
    };
    return jsonRequest("/api/", data).should.be.fulfilled
      .and.should.eventually
      .have.property('result')
      .with.have.property('comment')
      .include({song_id: data.params.song_id,
                comment: data.params.comment})
      .and.have.property('comment_id');
  });
  it('should return result', function () {
    const data = {
      method: "createComment",
      params: {
        song_id: 1,
        author: "ほげほげ2名",
        comment: "コメントbbb",
      },
    };
    return jsonRequest("/api/", data).should.be.fulfilled
      .and.should.eventually
      .have.property('result')
      .with.have.property('comment')
      .include({song_id: data.params.song_id,
                comment: data.params.comment})
      .and.have.property('comment_id');
  });
});

describe('getComments', function () {
  it('should succeed', function () {
    const data = {
      method: "getComments",
      params: {
        song_id: 1,
      },
    };
    return jsonRequest("/api/", data).should.be.fulfilled
      .and.should.eventually
      .have.property('result')
      .with.have.property('comments')
      .with.lengthOf.above(0);
  });
  it('should succeed with no song_id', function () {
    const data = {
      method: "getComments",
      params: {
      },
    };
    return jsonRequest("/api/", data).should.be.fulfilled
      .and.should.eventually
      .have.property('result')
      .with.have.property('comments')
      .with.lengthOf.above(0);
  });
});


describe('deleteComment', function () {
  it('should succeed', function () {
    const data = {
      method: "deleteComment",
      params: {
        comment_id: 1,
      },
    };
    return jsonRequest("/api/", data).should.be.fulfilled
      .and.should.eventually
      .have.property('result')
      .with.have.property('comment')
      .include({ comment_id: data.params.comment_id });
  });
  it('should fail to invalid id', function () {
    const data = {
      method: "deleteEntry",
      params: {
        comment_id: 10,
      },
    };
    return jsonRequest("/api/", data).should.be.rejected;
  });
});


describe('addPart', function () {
  it('should return result', function () {
    const data = {
      method: "addPart",
      params: {
        song_id: 1,
        part_name: "ほげほげなパート名",
        order: 10,
      },
    };
    return jsonRequest("/api/", data).should.be.fulfilled
      .and.should.eventually
      .have.property('result')
      .with.have.property('part')
      .include({song_id: data.params.song_id,
                order: data.params.order,
                part_name: data.params.part_name});
  });
  it('should failed with invalid song_id', function () {
    const data = {
      method: "addPart",
      params: {
        song_id: 100,
        part_name: "ほげほげなパート名",
        order: 10,
      },
    };
    return jsonRequest("/api/", data).should.be.rejected;
  });
});

describe('deletePart', function () {
  it('should return result', function () {
    const data = {
      method: "deletePart",
      params: {
        part_id: 1,
      },
    };
    return jsonRequest("/api/", data).should.be.fulfilled
      .and.should.eventually
      .have.property('result')
      .with.have.property('part')
      .include({song_id: 1,
                order: 0,
                part_id: 1});
  });
  it('should faild with invalid part_id', function () {
    const data = {
      method: "deletePart",
      params: {
        part_id: 100,
      },
    };
    return jsonRequest("/api/", data).should.be.rejected;
  });
});

describe('getLogs', function () {
  it('should return result', function () {
    const data = {
      method: "getLogs",
      params: {}
    };
    return jsonRequest("/api/", data).should.be.fulfilled
      .and.should.eventually
      .have.property('result')
      .with.have.property('logs');
  });
});
