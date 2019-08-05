
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
    entry: function (song, part) {
      this.$emit("entry", song, part);
    },
    showDetails: function (song) {
      this.$emit("show-details", song);
    },
  }
});

Vue.component('song-details-dialog', {
  template: '#song-details-dialog-template',
  data: function () {
    return { busy: false,
             locked: false,
             succeed: false,
             comment: "",
             author: "",
           };
  },
  props: { status: Object },
  methods: {
    hide: function () {
      this.status.onDetails = false;
      if (this.succeed) {
        this.succeed = false;
        this.locked = false;
      }
    },
    apply: function () {
    },
  }
});

Vue.component('new-entry-dialog', {
  data: function () {
    return { name: "",
             instName: "",
             message: "",
             busy: false,
             locked: false,
             succeed: false,
           };
  },
  props: { status: Object },
  template: '#new-entry-dialog-template',
  methods: {
    hide: function () {
      this.status.onEntry = false;
      if (this.succeed) {
        this.succeed = false;
        this.locked = false;
      }
    },
    apply: function() {
      // check parts
      var data = {
        song_id: this.status.target.song.song_id,
        part_id: this.status.target.part.part_id,
        name: this.name,
        inst_name: this.instName
      };

      this.busy = true;
      this.locked = true;
      var vm = this;
      sendRequest("entry", data, function (err, resp) {
        vm.busy = false;
        if (err) {
          vm.message = "request_error";
          return;
        }
        if (resp.error) {
          if (resp.error.code == -32101) {
            vm.message = "no_change";
            return;
          }
          vm.message = "server_error";
          return;
        }
        vm.message = "";
        vm.succeed = true;
        vm.$emit("request-done");
      });

      
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
          return;
        }
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
      onEntry: false,
      onDetails: false,
      target: { part: {},
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
      this.status.target.part = part;
      this.status.target.song = song;
    },
    showDetails: function (song) {
      this.status.onDetails = true;
      this.status.target.song = song;
    }
  },
  created: function created() {
    this.updateSongList();
  },
});

