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
        try {
          //console.log(data);
          result = JSON.parse(data);
        }
        catch (err) {
          console.error(data);
          reject(err + "data: " + data);
          return;
        }

        if (result.error) {
          reject(result.error.message);
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
});
