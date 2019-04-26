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
const Message = require('../models/message');

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
  let chatSession = req.chatSession;
  if(account_type == 0) {
    User.findOne({'_id': currentAcc.account_id}, (err, currentAcc) => {
      console.log(currentAcc.name);
      User.find((err, users) => {
        Message.find((err, messages) => {
          // finding users this current user is connected with
          let connected = users.filter(user => currentAcc.connected.indexOf(user.username) >= 0);
          res.render('message', {
            title: 'ChanceMap',
            currentAcc: currentAcc,
            account_type: account_type,
            connected: connected,
            notis: req.notis,
            messages: messages,
            users: users,
          });
        });
      });
    });
  } else if(account_type == 1) {
    Org.findOne({'_id': currentAcc.account_id}, (err, currentAcc) => {
      console.log(currentAcc.name);
      User.find((err, users) => {
        Message.find((err, messages) => {
          // finding users following this org
          let followers = users.filter(user => currentAcc.followers.indexOf(user.username) >= 0);
          res.render('message', {
            title: 'ChanceMap',
            currentAcc: currentAcc,
            account_type: account_type,
            connected: followers,
            notis: req.notis,
            messages: messages,
            users: users,
          });
        });
      });
    });
  }
});

module.exports = router;
