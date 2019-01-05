const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const path = require('path');
const config = require('../config/database.js');
const bodyParser = require('body-parser');

const Event = require('../models/event');
const Org = require('../models/org');
const User = require('../models/user');
const Notification = require('../models/notification');
const Admin = require('../models/admin');

// Database connection
const connection = mongoose.connection;

// creating a new event
router.get('/create', (req, res) => {
  if(!req.isAuthenticated()) {
    res.redirect('/login');
  } else {
    let account_type = req.user.account_type;
    let account_id = req.user.account_id;
    if(account_type == 1) {
        Org.findOne({'_id': account_id}, (err, org) => {
            res.render('events/orgs/create', {
                title: 'ChanceMap | Add a new Event',
                account_type: account_type,
                account_id: account_id,
                currentAcc: org,
                notis: req.notis
            });
        });
    } else if (account_type == 2){
      let account_type = req.user.account_type;
      let account_id = req.user.account_id;
      if(account_type == 2) {
          Admin.findOne({'_id': account_id}, (err, admin) => {
              res.render('events/orgs/create', {
                  title: 'ChanceMap | Add a new Event',
                  account_type: account_type,
                  account_id: account_id,
                  currentAcc: admin,
                  notis: req.notis
              });
          });
      }
    }
  }
});

// TODO: GIVE ADMIN RIGHT TO CREATE EVENT FOR ORGS
router.post('/create', (req, res) => {
    let data = req.body;
    let name = data.name;
    let org_name = data.org_name;
    let org_id = req.user.account_id;
    // TEST ADMIN CREATE EVENT CODE
    if(req.user.account_id == 2) {
      Org.findOne({'name': org_name}, (err, targetOrg) => {
        org_id = targetOrg._id;
      });
    }
    // REMEMBER TO DEBUG BEFORE COMMIT
    let desc = data.desc;
    let hashtags = data.hashtags;
    let address = data.address;
    let reg_form = data.reg_form;
    let reg_deadline = data.reg_deadline;
    let start_date = data.start_date;
    let end_date = data.end_date;
    let start_time = data.start_time;
    let end_time = data.end_time;
    let facebook = data.facebook;
    let website = data.website;
    let eventImage = data.eventImage;

    var newEvent = new Event({
        _id: new mongoose.Types.ObjectId(),
        created_at: new Date(),
        updated_at: new Date(),
        name: name,
        org_id: org_id,
        org_name: org_name,
        desc: desc,
        hashtags: hashtags,
        address: address,
        reg_form: reg_form,
        reg_deadline: reg_deadline,
        start_date: start_date,
        start_time: start_time,
        end_date: end_date,
        end_time: end_time,
        facebook: facebook,
        website: website,
        eventImage: eventImage
    });
    newEvent.save((err, event) => {
        if(err) {
            console.log(err);
            return;
        }
        console.log('new event created!');
        console.log(event);
        Org.findOne({'_id': org_id}, (err, org) => {
            let accounts = [];
            if(org.followers) {
                accounts = org.followers;
            }
            if(accounts.length > 0) {
                let newNoti = new Notification({
                    _id: new mongoose.Types.ObjectId(),
                    created_at: new Date(),
                    updated_at: new Date(),
                    title: org.name + ' just added a new event!',
                    body: org.name + ' is hosting ' + event.name,
                    image: 'event',
                    accounts: accounts
                });

                newNoti.save((err, noti) => {
                    if(err) {
                        console.log(err);
                        return;
                    }
                    console.log(noti);
                    User.find({'username': {$in: accounts}}, (err, users) => {
                        users.forEach(user => {
                            user.new_notis.push(noti._id);
                            user.save().then(result => {
                                console.log(result);
                            }).catch(err => {
                                res.send(err);
                            });
                        });
                        req.socketio.broadcast.to(req.user.username).emit('event', noti);
                        res.redirect('/events/manage');
                    });
                });
            } else {
                res.redirect('/events/manage');
            }
        });
    });
});

// events dashboard
router.get('/', (req, res) => {
  if(!req.isAuthenticated()) {
    res.redirect('/login');
  } else {
    let account_type = req.user.account_type;
    let account_id = req.user.account_id;
    Event.find((err, events) => {
        if(err) {
          console.log(err);
          return;
        }
        if(account_type == 1) {
            Org.findOne({'_id': account_id}, (err, org) => {
                let criteriaList = org.hashtags;
                events.forEach(event => {
                    event.matches = 0;
                    event.hashtags.forEach(hashtag => {
                        criteriaList.forEach(criteria => {
                            if(hashtag.includes(criteria)) {
                            event.matches++;
                            }
                        });
                    });
                });
                events.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
                res.render('events/dashboard', {
                    title: 'ChanceMap | Events',
                    account_type: account_type,
                    account_id: account_id,
                    currentAcc: org,
                    events: events,
                    criteriaList: criteriaList,
                    notis: req.notis
                });
            });
        } else if (account_type == 2){
          Admin.findOne({'_id': account_id}, (err, admin) => {
              let criteriaList = [];
              res.render('events/dashboard', {
                  title: 'ChanceMap | Events',
                  account_type: account_type,
                  account_id: account_id,
                  currentAcc: admin,
                  events: events,
                  criteriaList: criteriaList,
                  notis: req.notis
              });
          });
        } else {
            User.findOne({'_id': account_id}, (err, user) => {
                let criteriaList = user.interests.concat(user.skills);
                events.forEach(event => {
                    event.matches = 0;
                    event.hashtags.forEach(hashtag => {
                        criteriaList.forEach(criteria => {
                            if(hashtag.includes(criteria)) {
                            event.matches++;
                            }
                        });
                    });
                });
                events.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
                res.render('events/dashboard', {
                    title: 'ChanceMap | Events',
                    account_type: account_type,
                    account_id: account_id,
                    currentAcc: user,
                    events: events,
                    criteriaList: criteriaList,
                    notis: req.notis
                });
            });
        }
    });
  }
});

// viewing my own events (orgs)
router.get('/manage', (req, res) => {
  if(!req.isAuthenticated()) {
    res.redirect('/login');
  } else {
    let account_type = req.user.account_type;
    let account_id = req.user.account_id;
    if (account_type == 1) {
      Event.find({org_id: account_id}, (err, events) => {
          if(err) {
            console.log(err);
            return;
          }
          Org.findOne({'_id': account_id}, (err, org) => {
              if(err) {
                  console.log(err);
                  return;
              }
              res.render('events/orgs/manage', {
                  title: 'ChanceMap | My Events',
                  account_type: account_type,
                  account_id: account_id,
                  currentAcc: org,
                  events: events,
                  notis: req.notis
              });
          });
      });
    } else if (account_type == 2) {
        Event.find({},(err,events) => {
          Admin.findOne({}, (err, admin) => {
              let criteriaList = [];
              res.render('events/orgs/manage', {
                  title: 'ChanceMap | Manage Events',
                  account_type: account_type,
                  account_id: account_id,
                  currentAcc: admin,
                  events: events,
                  criteriaList: criteriaList,
                  notis: req.notis
              });
          });
        });
    };
  }
});

// deleting events (orgs)
router.get('/delete/:id', (req, res) => {
  if(!req.isAuthenticated()) {
    res.redirect('/login');
  } else {
    let account_type = req.user.account_type;
    let data = req.body;
    let event_id = req.params.id;
    let event_name = data.name;
    let org_id = req.user.account_id;
    let org_name = data.org_name;
    let desc = data.desc;
    let hashtags = data.hashtags;
    let app_form = data.app_form;
    let app_deadline = data.app_deadline;
    let facebook = data.facebook;
    let website = data.website;
    let jobImage = data.jobImage;
    let accounts = [];
    let org_followers = data.org_followers;
    if(account_type == 1 || account_type == 2) {
        Event.findOneAndRemove({_id: event_id}, (err, event) => {
            if(err) {
                console.log(err);
            } else {
                console.log(event);
                Org.findOne({'_id': org_id}, (err, org) => {
                    if(org_followers) {
                        accounts = org_followers;
                    }

                    if(accounts.length > 0) {
                        let newNoti = new Notification({
                            _id: new mongoose.Types.ObjectId(),
                            created_at: new Date(),
                            updated_at: new Date(),
                            title: org_name + ' just removed their event!',
                            body: org_name + ' removed ' + event_name,
                            image: 'event',
                            accounts: accounts
                        });

                        newNoti.save((err, noti) => {
                            if(err) {
                                console.log(err);
                                return;
                            }
                            console.log(noti);
                            User.find({'username': {$in: accounts}}, (err, users) => {
                                users.forEach(user => {
                                    user.new_notis.push(noti._id);
                                    user.save().then(result => {
                                        console.log(result);
                                    }).catch(err => {
                                        res.send(err);
                                    });
                                });
                                req.socketio.broadcast.to(req.user.username).emit('event', noti);
                                res.redirect('/events/manage');
                            });
                        });
                    } else {
                        res.redirect('/events/manage');
                    }
                });
            }
        });
    } else {
        res.redirect('/');
    }
  }
});

// editing existing events
router.get('/edit/:id', (req, res) => {
    if(!req.isAuthenticated()) {
      res.redirect('/login');
    } else {
      let account_type = req.user.account_type;
      let account_id = req.user.account_id;
      Event.findOne({_id: req.params.id}, (err, event) => {
          if(err) {
              console.log(err);
              return;
          }
          if(account_type == 1 ) {
              Org.findOne({'_id': account_id}, (err, org) => {
                  res.render('events/orgs/edit', {
                      title: 'ChanceMap | My Events',
                      account_type: account_type,
                      account_id: account_id,
                      currentAcc: org,
                      event: event,
                      notis: req.notis
                  })
              })
          } else if (account_type == 2){
              Admin.findOne({'_id': account_id}, (err, admin) => {
                  res.render('events/orgs/edit', {
                      title: 'ChanceMap | Manage Events',
                      account_type: account_type,
                      account_id: account_id,
                      currentAcc: admin,
                      event: event,
                      notis: req.notis
                  })
              })
          }else {
              res.redirect('/');
          }
      });
    }
});

router.post('/edit/:id', (req, res) => {
    let data = req.body;
    let event_id = req.params.id;
    let name = data.name;
    let org_id = req.user.account_id;
    let org_name = data.org_name;
    let desc = data.desc;
    let hashtags = data.hashtags;
    let app_form = data.app_form;
    let app_deadline = data.app_deadline;
    let facebook = data.facebook;
    let website = data.website;
    let jobImage = data.jobImage;
    let accounts = [];
    let org_followers = data.org_followers;

    Event.findOne({_id: event_id}, (err, event) => {
    		if(err) {
    			res.send('Database error...');
    			console.log(err);
    			return;
        }
        console.log(event);
        if(!event.created_at) {
          event.created_at = new Date();
        }
        event.updated_at = new Date();
        event.name = data.name;
        event.desc = data.desc;
        event.hashtags = data.hashtags;
        event.address = data.address;
        event.reg_form = data.reg_form;
        event.reg_deadline = data.reg_deadline;
        event.start_date = data.start_date;
        event.end_date = data.end_date;
        event.start_time = data.start_time;
        event.end_time = data.end_time;
        event.facebook = data.facebook;
        event.website = data.website;
        event.eventImage = data.eventImage;

        event.save().then(result => {
            console.log(result);
            Org.findOne({'_id': org_id}, (err, org) => {
                let accounts = [];
                if(org_followers) {
                    accounts = org_followers;
                }
                if(accounts.length > 0) {
                    let newNoti = new Notification({
                        _id: new mongoose.Types.ObjectId(),
                        created_at: new Date(),
                        updated_at: new Date(),
                        title: org_name + ' just edited their event!',
                        body: org_name + ' made an edit to ' + event.name,
                        image: 'event',
                        accounts: accounts
                    });

                    newNoti.save((err, noti) => {
                        if(err) {
                            console.log(err);
                            return;
                        }
                        console.log(noti);
                        User.find({'username': {$in: accounts}}, (err, users) => {
                            users.forEach(user => {
                                user.new_notis.push(noti._id);
                                user.save().then(result => {
                                    console.log(result);
                                }).catch(err => {
                                    res.send(err);
                                });
                            });
                            req.socketio.broadcast.to(req.user.username).emit('event', noti);
                            res.redirect('/events/manage');
                        });
                    });
                } else {
                    res.redirect('/events/manage');
                }
            });
        }).catch(err => {
            res.send(err);
        });
    });
});

module.exports = router;
