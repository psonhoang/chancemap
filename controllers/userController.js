const express = require('express');
const router = express.Router();

// Models
const User = require('../models/user');
const Org = require('../models/org');
const Admin = require('../models/admin');
const Message = require('../models/message');

// @Routes
router.get('/', (req, res) => {
  if(!req.isAuthenticated()) {
    res.redirect('/login');
  } else {
    let account_id = req.user.account_id;
    let account_type = req.user.account_type;
    Message.find((err, messages) => {
      User.find((err, users) => {
        if(err) {
          console.log(err);
          return;
        }
        if(account_type == 1) {
            Org.findOne({'_id': account_id}, (err, org) => {
                let followers = users.filter(user => org.followers.indexOf(user.username) >= 0);
                let criteriaList = org.hashtags;
                users.forEach(user => {
                    let userHashtags = user.interests.concat(user.skills);
                    user.matches = 0;
                    userHashtags.forEach(hashtag => {
                        criteriaList.forEach(criteria => {
                            if(hashtag.includes(criteria)) {
                            user.matches++;
                            }
                        });
                    });
                });
                users.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
                res.render('users/dashboard', {
                    title: 'ChanceMap | Users',
                    account_type: account_type,
                    account_id: account_id,
                    currentAcc: org,
                    users: users,
                    criteriaList: criteriaList,
                    notis: req.notis,
                    messages: messages,
                    connected: followers,
                });
            })
        } else if (account_type == 2){
          Admin.findOne({'_id': account_id}, (err, admin) => {
              let criteriaList = [];
              res.render('users/dashboard', {
                  title: 'ChanceMap | Users',
                  account_type: account_type,
                  account_id: account_id,
                  currentAcc: admin,
                  users: users,
                  criteriaList: criteriaList,
                  notis: req.notis,
                  messages: messages,
              });
          })
        } else {
            User.findOne({'_id': account_id}, (err, user) => {
                let connected = users.filter(client => user.connected.indexOf(client.username) >= 0);
                let criteriaList = user.interests.concat(user.skills);
                users.forEach(user => {
                    let userHashtags = user.interests.concat(user.skills);
                    user.matches = 0;
                    userHashtags.forEach(hashtag => {
                        criteriaList.forEach(criteria => {
                            if(hashtag.includes(criteria)) {
                            user.matches++;
                            }
                        });
                    });
                });
                users.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
                res.render('users/dashboard', {
                    title: 'ChanceMap | Users',
                    account_type: account_type,
                    account_id: account_id,
                    currentAcc: user,
                    users: users,
                    criteriaList: criteriaList,
                    notis: req.notis,
                    messages: messages,
                    connected: connected,
                });
            });
        }
      });
    });
  }
});

// Exports
module.exports = router;
