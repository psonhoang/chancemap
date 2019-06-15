const express = require('express');
const router = express.Router();

const Admin = require('../models/admin');
const User = require('../models/user');
const Org = require('../models/org');
const Event = require('../models/event');
const Job = require('../models/job');
const Opportunitiy = require('../models/opportunity');
const Message = require('../models/message');

// @Routes
// @GET '/calendar'
router.get('/', (req, res) => {
    let account_type = req.user.account_type;
    let account_id = req.user.account_id;
    Message.find((err, messages) => {
      if(err) {
        console.log(err);
        return;
      }
      Org.find((err, orgs) => {
        if(err) {
          console.log(err);
          return;
        }
        User.find((err, users) => {
          if(err) {
            console.log(err);
            return;
          }
          Event.find({}, (err, events) => {
              if(err) {
                  console.log(err);
                  return;
              }
              Job.find({}, (err, jobs) => {
                  if(err) {
                      console.log(err);
                      return;
                  }
                  Opportunitiy.find({}, (err, opportunities) => {
                      if(err) {
                          console.log(err);
                          return;
                      }
                      if(account_type == 0 ) {
                          User.findOne({'_id': account_id}, (err, user) => {
                              let connected = users.filter(client => user.connected.indexOf(client.username) >= 0);
                              const criteriaList = user.interests.concat(user.skills);
                              res.render('calendar', {
                                  title: "ChanceMap | Calendar",
                                  account_type: req.user.account_type,
                                  account_id: req.user.account_id,
                                  currentAcc: user,
                                  events: events,
                                  jobs: jobs,
                                  opportunities: opportunities,
                                  notis: req.notis,
                                  messages: messages,
                                  connected: connected,
                                  users: users,
                                  criteriaList: criteriaList
                              });
                          });
                      } else if(account_type == 1) {
                          Org.findOne({'_id': account_id}, (err, org) => {
                              let followers = users.filter(user => org.followers.indexOf(user.username) >= 0);
                              const criteriaList = org.hashtags;
                              res.render('calendar', {
                                  title: "ChanceMap | Calendar",
                                  account_type: req.user.account_type,
                                  account_id: req.user.account_id,
                                  currentAcc: org,
                                  events: events,
                                  jobs: jobs,
                                  opportunities: opportunities,
                                  notis: req.notis,
                                  messages: messages,
                                  connected: followers,
                                  users: users,
                                  criteriaList: criteriaList
                              });
                          });
                      } else {
                          Admin.findOne({'_id': account_id}, (err, admin) => {
                              res.render('calendar', {
                                  title: "ChanceMap | Calendar",
                                  account_type: req.user.account_type,
                                  account_id: req.user.account_id,
                                  currentAcc: admin,
                                  events: events,
                                  jobs: jobs,
                                  opportunities: opportunities,
                                  notis: req.notis,
                                  messages: messages,
                                  connected: connected,
                                  users: users,
                                  criteriaList: []
                              });
                          });
                      }
                  })
              });
          });
        })
      })
    })
});

module.exports = router;
