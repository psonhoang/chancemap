const express = require('express');
const router = express.Router();
const app = express();
const mongoose = require('mongoose');
const config = require('../config/database.js');

// for file uploading
const crypto = require('crypto');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');

// models
const Account = require('../models/account');
const User = require('../models/user');
const Org = require('../models/org');
const Notification = require('../models/notification');

// socket.io
const http = require('http');
const server = http.Server(app);


// Database connection
const conn = mongoose.connection;

// Init gfs
let gfs;

// connecting to db
conn.once('open', () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
  console.log('connected to uploads database!');
});

// Create storage engine
const storage = new GridFsStorage({
  url: config.database,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });

// messenger route
router.get('/', (req, res) => {
  let currentAcc = req.user;
  let account_type = currentAcc.account_type;
  //let chatables = req.chatables; //array of connected sockets
  let currentSocket = req.socketio;
  // let currentChatID = currentSocket.currentChatID;
  // let currentChatName = currentSocket.currentChatName;

  if(account_type == 0) {
    User.findOne({'_id': currentAcc.account_id}, (err, currentAcc) => {
      console.log(currentAcc.name);
      //console.log(currentSocket);
      //console.log(req.socketio);
      //console.log(currentSocket.rooms);
      // console.log(currentChatID);
      // console.log(currentChatName);
      // chatables.forEach(chatable => {
      //   console.log(chatable);
      // })

      User.find((err, users) => {
        // finding users this current user is connected with
        let connected = users.filter(user => currentAcc.connected.indexOf(user.username) >= 0)
        let ids = [];
        connected.forEach(user => {
          ids.push(user._id);
        })
        //console.log(ids);
        res.render('message', {
          title: 'ChanceMap',
          currentAcc: currentAcc,
          account_type: account_type,
          connected: connected,
          ids: ids,
          //chatables: chatables,
          currentSocket: currentSocket,
          // room_id: currentChatID,
          // user_name: currentChatName,
          notis: req.notis
        });
      })
    })
  }
})



module.exports = router;
