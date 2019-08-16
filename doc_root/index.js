
function sendRequest(method, params, callback) {
  var xhr = new XMLHttpRequest();
  xhr.addEventListener('load', function () {
    var resp = xhr.response || {};
    // hack for IE
    if (resp && xhr.responseType !== "json") {
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

  try {
    xhr.responseType = 'json';
  } catch (e) {
  }
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
    readOnly: { type: Boolean, default: false },
  },
  data: function () {
    return {
    };
  },
  methods: {
    togglePlayer: function(song) {
      song._showPlayer = !song._showPlayer;
    },
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
    state: Object,
    isLoading: Boolean,
    readOnly: { type: Boolean, default: false },
  },
  methods: {
    hide: function () {
      this.state.onShowDetails = false;
      this.message = "";
      if (this.succeed) {
        this.succeed = false;
        this.locked = false;
      }
    },
    deleteEntry: function (part) {
      this.busy = true;
      var c = this;
      var parts = this.state.target.song.parts;
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
        part.instrument_name = "";
        c.$emit("request-done");
      });
    },
    deletePart: function (part) {
      this.busy = true;
      var c = this;
      var parts = this.state.target.song.parts;
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
    editDetails: function () {
      this.$emit("edit-details");
    },
    postComment: function () {
      this.succeed = false;
      if (!this.author.length) {
        this.message = "no_author";
        return;
      }
      if (!this.comment.length) {
        this.message = "no_comment";
        return;
      }

      this.busy = true;
      this.locked = true;
      var c = this;
      var data = { author: this.author,
                   comment: this.comment,
                   song_id: this.state.target.song.song_id };
      var comments = this.state.target.song.comments;
      sendRequest("createComment", data, function (err, resp) {
        c.busy = false;
        c.locked = false;
        if (err || resp.error) {
          c.message = "request_error";
          return;
        }
        c.succeed = true;
        c.comment = "";
        comments.push(resp.result.comment);
        c.message = "";
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
  props: { state: Object },
  template: '#new-entry-dialog-template',
  methods: {
    hide: function () {
      this.state.onEntry = false;
      if (this.succeed) {
        this.succeed = false;
        this.locked = false;
      }
    },
    apply: function() {
      // check parts
      var data = {
        song_id: this.state.target.song.song_id,
        part_id: this.state.target.part.part_id,
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

Vue.component('edit-song-dialog', {
  data: function () {
    return {
      title: "",
      reference: "",
      url: "",
      author: "",
      comment: "",
      parts: [
        {part_name:"リード/コード系1", required: 1},
        {part_name:"リード/コード系2", required: 0},
        {part_name:"リード/コード系3", required: 0},
        {part_name:"ベース系1", required: 1},
        {part_name:"ベース系2", required: 0},
        {part_name:"ベース系3", required: 0},
        {part_name:"ドラム/パーカッション系1", required: 1},
        {part_name:"ドラム/パーカッション系2", required: 0},
        {part_name:"ドラム/パーカッション系3", required: 0},
      ],
      message: "",
      busy: false,
      locked: false,
      succeed: false,
      mode: "create",
      changeOrderMode: false,
      showDeletePartAlert: false,
    };
  },
  props: { state: Object },
  template: '#edit-song-dialog-template',
  methods: {
    setTarget: function () {
      this.mode = "edit";
      var a = [ "title", "reference", "url", "author", "comment" ];
      for (var i in a) {
        var k = a[i];
        this[k] = this.state.target.song[k];
      }
      this.parts.splice(0, this.parts.length);
      for (i in this.state.target.song.parts) {
        var part = this.state.target.song.parts[i];
        var newPart = {};
        a = ["part_id", "song_id", "part_name", "required", "user_id"];
        for (i in a) {
          k = a[i];
          newPart[k] = part[k];
        };
        this.parts.push(newPart);
        if (part.user_id) {
          this.showDeletePartAlert = true;
        }
      }
    },
    hide: function () {
      this.state.onSongEdit = false;
      this.changeOrderMode = false;
      if (this.succeed || this.mode == "edit") {
        this.resetAll();
        this.mode = "create";
      }
    },
    resetAll: function () {
      /* IE cannot support for-of
        for (var k of ["title", "reference", "url", "comment", ]) {
        this[k] = "";
        }
      */
      var a = ["title", "reference", "url", "comment", ];
      for (var i in a) {
        var k = a[i];
        this[k] = "";
      }
      
      this.busy = false;
      this.message = "";
      this.parts.splice(0, this.parts.length);
      a = [ {part_name:"リード/コード系1", required: 1},
            {part_name:"リード/コード系2", required: 0},
            {part_name:"リード/コード系3", required: 0},
            {part_name:"ベース系1", required: 1},
            {part_name:"ベース系2", required: 0},
            {part_name:"ベース系3", required: 0},
            {part_name:"ドラム/パーカッション系1", required: 1},
            {part_name:"ドラム/パーカッション系2", required: 0},
            {part_name:"ドラム/パーカッション系3", required: 0},
          ];
      for (i in a) {
        this.parts.push(a[i]);
      }

      this.locked = false;
      this.succeed = false;
    },
    movePart: function (part, direction) {
      var index = this.parts.findIndex(function (el) { return el === part; });
      if (direction == 1) {
        if (index != this.parts.length - 1) {
          this.parts.splice(index, 2, this.parts[index+1], this.parts[index]);
        }
      } else if  (direction == -1) {
        if (index != 0) {
          this.parts.splice(index-1, 2, this.parts[index], this.parts[index-1]);
        }
      }
    },
    addPart: function () {
      this.parts.push({part_name: "", required: 0});
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
    postNewSong: function () {
      // check params
      /* IE not supports for-of
      for (var k of ["title", "reference", "author"]) {
        if (!this[k].length) {
          this.message = "no_" + k;
          return;
        }
      }
      */
      this.message = "";
      var a = ["title", "reference", "author"];
      for (var i in a) {
        var k = a[i];
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
      // for (var part of this.parts) {
      for (i in this.parts) {
        var part = this.parts[i];
        if (part.part_name.length == 0) {
          this.message = "blank_part_exists";
          return;
        }
        parts.push(part);
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
      this.locked = true;
      var c = this;

      if (this.mode == "edit") {
        // updateSong
        data.parts = this.parts;
        data.song_id = this.state.target.song.song_id;
        sendRequest("updateSong", data, function (err, resp) {
          c.busy = false;
          c.locked = false;
          if (err) {
            c.message = "request_error";
            return;
          }
          if (resp.error) {
            if (resp.error.code == -32104) {
              c.message = "duplicated_title";
              return;
            }
            c.message = "server_error";
            return;
          }
          c.succeed = true;
          c.locked = true;
          c.$emit("request-done");
        });
        return;
      }

      // createSong
      sendRequest("createSong", data, function (err, resp) {
        c.busy = false;
        c.locked = false;
        if (err) {
          c.message = "request_error";
          return;
        }
        if (resp.error) {
          if (resp.error.code == -32104) {
            c.message = "duplicated_title";
            return;
          }
          c.message = "server_error";
          return;
        }
        c.locked = true;
        c.succeed = true;
        c.$emit("request-done");
      });
    },
  }
});

// create view-model
var app = new Vue({
  el: '#main-frame',
  data: {
    state: {
      onSongEdit: false,
      onEntry: false,
      onShowDetails: false,
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
      var that = this;
      sendRequest("getSongs", {}, function (err, resp) {
        that.isLoadingSongs = false;
        if (err || resp.error) {
          console.log(resp);
          if (resp.error && resp.error.code == -32200) {
            that.error = "invalid_token";
            return;
          }
          that.error = "list_songs_failed";
          return;
        }
        that.songs.splice(0, that.songs.length);
        //for (var song of resp.result.songs) {
        for (var i in resp.result.songs) {
          var song = resp.result.songs[i];
          song._showPlayer = false;
          that.songs.push(song);
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
      var that = this;
      sendRequest("getLogs", data, function (err, resp) {
        that.isLoadingLogs = false;
        if (err || resp.error) {
          console.log(resp);
          if (resp.error && resp.error.code == -32200) {
            that.error = "invalid_token";
            return;
          }
          that.error = "list_logs_failed";
          return;
        }
        that.logs.splice(0, that.logs.length);
        //for (var log of resp.result.logs) {
        for (var i in resp.result.logs) {
          var log = resp.result.logs[i];
          that.logs.push(log);
        }
        that.totalLogs = resp.result.total_logs;
      });
    },
    entry: function (song, part) {
      this.state.onEntry = true;
      this.state.target.part = part;
      this.state.target.song = song;
    },
    showDetails: function (song) {
      this.state.onShowDetails = true;
      this.state.target.song = song;
      if (!song.comments) {
        var data = { song_id: song.song_id };
        var c = this;
        this.isLoadingComments = true;
        var that = this;
        sendRequest("getComments", data, function (err, resp) {
          that.isLoadingComments = false;
          c.$set(song, "comments", resp.result.comments);
        });
      }
    },
    editDetails: function () {
      this.state.onShowDetails = false;
      this.$refs.editSong.setTarget();
      this.state.onSongEdit = true;
    },
  },
  created: function created() {
    this.updateSongList();
    this.updateLogList(1);
  },
});

