
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
  params.token = (entryConfig || {}).token || "";
  var data = JSON.stringify({method: method,
                             params: params});
  xhr.send(data);
}

Vue.component('song-list', {
  template: '#song-list-template',
  props: {
    songs: Array,
    totalSongs: Number,
    isLoading: Boolean,
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

Vue.component('log-list', {
  template: '#log-list-template',
  props: {
    logs: Array,
    totalLogs: Number,
  },
  data: function () {
    return {
      pages: [],
      currentPage: 1,
      currentLogs: [],
      totalPage: 1,
      unit: 10
    };
  },
  watch: {
    logs: function (val, oldVal) {
      this.updateLogs();
    },
    totalLogs: function (val, oldVal) {
      this.totalPage = Math.floor((val + -1) / 10) + 1;
      this.pages.splice(0, this.pages.length);
      for (var i = 1; i <= this.totalPage; i++) {
        this.pages.push(i);
      }
    }
  },
  methods: {
    updateLogs: function() {
      this.currentLogs.splice(0, this.currentLogs.length);
      var begin = (this.currentPage - 1) * this.unit;
      for (var i = 0; i < this.unit; i++) {
        if (this.logs[begin + i] == undefined) {
          break;
        }
        this.currentLogs.push(this.logs[begin + i]);
      }
    },
    toPage: function (num) {
      this.currentPage = num;
      var index = (this.currentPage - 1) * this.unit;
      if (index > this.logs.length) {
        this.$emit("loadLogs", index);
        return;
      }
      this.updateLogs();
    },
    nextPage: function () {
      if (this.currentPage < this.totalPage) {
        this.toPage(this.currentPage + 1);
      }
    },
    prevPage: function () {
      if (this.currentPage > 1) {
        this.toPage(this.currentPage - 1);
      }
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
             message: "",
           };
  },
  props: {
    status: Object,
    isLoading: Boolean,
  },
  methods: {
    hide: function () {
      this.status.onDetails = false;
      this.message = "";
      if (this.succeed) {
        this.succeed = false;
        this.locked = false;
      }
    },
    deleteEntry: function (part) {
      this.busy = true;
      var c = this;
      var parts = this.status.target.song.parts;
      if (!window.confirm("本当に取り消しますか？")) {
        return;
      }
      sendRequest("deleteEntry", part, function (err, resp) {
        c.busy = false;
        if (err) {
          c.message = "request_error";
          return;
        }
        part.entry_name = "";
        c.$emit("request-done");
      });
    },
    deletePart: function (part) {
      this.busy = true;
      var c = this;
      var parts = this.status.target.song.parts;
      if (!window.confirm("本当に削除しますか？")) {
        return;
      }
      sendRequest("deletePart", part, function (err, resp) {
        c.busy = false;
        if (err) {
          c.message = "request_error";
          return;
        }
        for (var i = 0; i < parts.length; i++) {
          if (parts[i].part_id == part.part_id) {
            parts.splice(i, 1);
            break;
          }
        }
        c.$emit("request-done");
      });
    },
    updateDetail: function () {
    },
    postComment: function () {
      this.busy = true;
      this.locked = true;
      var c = this;
      var data = { author: this.author,
                   comment: this.comment,
                   song_id: this.status.target.song.song_id };
      var comments = this.status.target.song.comments;
      sendRequest("createComment", data, function (err, resp) {
        c.busy = false;
        c.locked = false;
        if (err) {
          c.message = "request_error";
          return;
        }
        c.comment = "";
        comments.push(resp.result.comment);
        c.message = "comment_post_done";
        c.$emit("request-done");
      });
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
        instrument_name: this.instName
      };

      this.busy = true;
      this.locked = true;
      var vm = this;
      sendRequest("createEntry", data, function (err, resp) {
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
    isLoadingSongs: false,

    logs: [],
    totalLogs: 0,
    isLoadingLogs: false,
    isLoadingComments: false,

    error: "",
    
  },
  methods: {
    updateContents: function () {
      this.updateSongList();
      this.updateLogList();
    },
    updateSongList: function () {
      // load song list
      this.isLoadingSongs = true;
      sendRequest("getSongs", {}, (err, resp) => {
        this.isLoadingSongs = false;
        if (err || resp.error) {
          console.log(resp);
          if (resp.error && resp.error.code == -32200) {
            this.error = "invalid_token";
            return;
          }
          this.error = "list_songs_failed";
          return;
        }
        this.songs.splice(0, this.songs.length);
        for (var song of resp.result.songs) {
          this.songs.push(song);
        }
      });
    },
    updateLogList: function (index) {
      // load song list
      this.isLoadingLogs = true;
      var loadUnit = 100;
      var data = { limit: loadUnit };
      if (index) {
        var need = (index - this.logs.length);
        while (data.limit < need) {
          data.limit += loadUnit;
        }
        data.offset = this.logs.length;
      };
      sendRequest("getLogs", data, (err, resp) => {
        this.isLoadingLogs = false;
        if (err || resp.error) {
          console.log(resp);
          if (resp.error && resp.error.code == -32200) {
            this.error = "invalid_token";
            return;
          }
          this.error = "list_logs_failed";
          return;
        }
        this.logs.splice(0, this.logs.length);
        for (var log of resp.result.logs) {
          this.logs.push(log);
        }
        this.totalLogs = resp.result.total_logs;
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
      if (!song.comments) {
        var data = { song_id: song.song_id };
        var c = this;
        this.isLoadingComments = true;
        sendRequest("getComments", data, (err, resp) => {
          this.isLoadingComments = false;
          c.$set(song, "comments", resp.result.comments);
        });
      }
    }
  },
  created: function created() {
    this.updateSongList();
    this.updateLogList(1);
  },
});

