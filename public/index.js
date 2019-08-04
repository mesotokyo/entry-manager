
function sendRequest(method, params, callback) {
  var xhr = new XMLHttpRequest();
  xhr.addEventListener('load', () => {
    var resp = xhr.response || {};
    // hack for IE
    if (resp && xhr.responseType === "") {
      try {
        resp = JSON.parse(xhr.response);
      } catch(e) {
        console.log("Newslash.post: cannot parse JSON");
      }
    }
    if (xhr.status == 200) {
      callback(null, resp);
      return;
    }
    callback(xhr, resp);
  });
  xhr.responseType = 'json';
  xhr.open('POST', '/api/');
  xhr.setRequestHeader("Content-Type", "application/json");
  var data = JSON.stringify({method: method,
                             params: params});
  xhr.send(data);
}

Vue.component('song-list', {
  template: '#song-list-template',
  props: {
    songs: Array,
  },
  methods: {
    entry: function(song, part) {
      this.$emit("entry", song, part);
    },
  }
});

Vue.component('new-entry-dialog', {
  data: function () {
    return { name: "",
             instName: "",
             message: "",
             busy: false,
           };
  },
  props: { status: Object },
  template: '#new-entry-dialog-template',
  methods: {
    hide: function () {
      this.status.onEntry = false;
    },
    apply: function() {
    },
  },
});

Vue.component('new-song-dialog', {
  data: function () {
    return {
      title: "",
      reference: "",
      url: "",
      author: "",
      comment: "",
      parts: [{name:""},],
      message: "",
      busy: false,
    };
  },
  props: { status: Object },
  template: '#new-song-dialog-template',
  methods: {
    hide: function () {
      this.status.onSongAdd = false
    },
    resetAll: function () {
      for (var k of ["title", "reference", "url", "comment", ]) {
        this[k] = "";
      }
      this.busy = false;
      this.message = "";
      this.parts.splice(0, this.parts.length, {name:""});
    },
    addPart: function () {
      this.parts.push({name: ""});
    },
    deletePart: function (part) {
      if (this.parts.length == 1) { return; }
      var index = this.parts.findIndex(function (elm, index) {
        return (elm === part);
      });
      if (index != -1) {
        this.parts.splice(index, 1);
      }
    },
    apply: function () {
      // check params
      for (var k of ["title", "reference", "author"]) {
        if (!this[k].length) {
          this.message = "no_" + k;
          return;
        }
      }
      if (this.url.length) {
        try {
          var parsed = new URL(this.url);
        }
        catch (err) {
          this.message = "invalid_url";
          return;
        }
      }

      // check parts
      var parts = [];
      for (var part of this.parts) {
        if (part.name.length == 0) {
          this.message = "blank_part_exists";
          return;
        }
        parts.push(part.name);
      }

      // create request data
      var data = {
        title: this.title,
        reference: this.reference,
        url: this.url,
        comment: this.comment,
        author: this.author,
        parts: parts,
      };
      this.busy = true;
      var vm = this;
      sendRequest("createSong", data, function (err, resp) {
        vm.busy = false;
        if (err) {
          vm.message = "request_error";
        }
        else {
          if (resp.error) {
            if (resp.error.code == -32100) {
              vm.message = "duplicated_title";
              return;
            }
            vm.message = "server_error";
            return;
          }
          vm.$emit("request-done");
          vm.resetAll();
          vm.hide();
        }
      });
    },
  }
});

// create view-model
var app = new Vue({
  el: '#main-frame',
  data: {
    status: {
      onSongAdd: false,
      onEntry: true,
      entryTarget: { part: {},
                     song: {} },
    },
    songs: [],
    error: "",
  },
  methods: {
    updateSongList: function () {
      // load song list
      sendRequest("listSongs", {}, (err, resp) => {
        if (err) {
          this.error = "list_songs_failed";
          return;
        }
        this.songs.splice(0, this.songs.length);
        for (var song of resp.result.songs) {
          this.songs.push(song);
        }
      });
    },
    entry: function (song, part) {
      this.status.onEntry = true;
      console.log(part);
      console.log(song);
      this.status.entryTarget.part = part;
      this.status.entryTarget.song = song;
    },
  },
  created: function created() {
    this.updateSongList();
  },
});

