const express = require('express');
const router = express.Router();

// Models
const User = require('../models/user');
const Org = require('../models/org');
const Admin = require('../models/admin');
const Event = require('../models/event');
const Job = require('../models/job');
const Opportunity = require('../models/opportunity');

//Utility Function
function sortByHashtags(list, properties, criteria) {
  list.forEach(item => {
    item.matches = 0;
    properties.forEach(property => {
      item[property].forEach(tag => {
        criteria.forEach(criterion => {
          if (tag.includes(criterion)) {
            item.matches++;
          }
        });
      });
    });
  });
  list.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
  return list;
}

// @Routes
//View Dashboard
router.get('/', async (req, res) => {
  let account_id = req.user.account_id;
  let account_type = req.user.account_type;
  
  var currentAcc;
  var connected;
  var criteriaList;

  User.find().then(async users => {

    if (account_type == 1) {
      currentAcc= await Org.findOne({ '_id': account_id });
      connected = users.filter(user => currentAcc.followers.indexOf(user.username) >= 0);
      criteriaList = currentAcc.hashtags;
    }
    else if (account_type == 2) {
      criteriaList = [''];
      connected = [];
      currentAcc = await Admin.findOne({ '_id': account_id});
    } else {
      currentAcc = await User.findOne({ '_id': account_id });
      connected = users.filter(client => user.connected.indexOf(client.username) >= 0);
      criteriaList = user.interests.concat(user.skills);
    }

    users = sortByHashtags(users, ['skills', 'interests'], criteriaList);

    res.render('users/dashboard', {
      title: 'ChanceMap | Users',
      account_type: account_type,
      account_id: account_id,
      currentAcc: currentAcc,
      users: users,
      criteriaList: criteriaList,
      notis: req.notis,
      connected: connected,
    });

  });
});

//View others' profiles
router.get('/:username', async (req, res) => {

  let account_id = req.user.account_id;
  let account_type = req.user.account_type;
  let currentAcc = req.user;

  User.findOne({ 'username': req.params.username }).then(async currentUser => {
    const orgs = await Org.find();
    const users = await User.find();
    const events = await Event.find();
    const jobs = await Job.find();
    const opportunities = await Opportunity.find();

    let criteriaList = currentUser.interests.concat(currentUser.skills);
    let following = orgs.filter(org => currentUser.following.indexOf(org.username) >= 0);
    let connected = users.filter(user => currentUser.connected.indexOf(user.username) >= 0);
    let interestedEvent = events.filter(event => currentUser.events.indexOf(event._id) >= 0);
    let interestedJob = jobs.filter(job => currentUser.jobs.indexOf(job._id) >= 0);
    let interestedOpp = opportunities.filter(opp => currentUser.opps.indexOf(opp._id) >= 0);

    if (account_type == 0) {
      currentAcc = await User.findOne({ '_id': currentAcc.account_id });
    } else if (account_type == 1) {
      currentAcc = await Org.findOne({ '_id': currentAcc.account_id });
    }

    res.render('users/othersProfile', {
      title: 'ChanceMap | Following',
      orgs: following,
      users: connected,
      account_type: account_type,
      account_id: account_id,
      currentUser: currentUser,
      currentAcc: currentAcc,
      notis: req.notis,
      criteriaList: criteriaList,
      connected: connected,
      events: interestedEvent,
      jobs: interestedJob,
      opportunities: interestedOpp,
    });
  }).catch(err => {
    throw (err);
  });
});

//View following Orgs
router.get('/:username/following', async (req, res) => {

  let account_type = req.user.account_type;
  let account_id = req.user.account_id;
  let username = req.params.username;

  if (account_type != 0 || username != req.user.username) {
    res.redirect('/');
  }

  try {
  var user = await User.findOne({ 'username': username });
  var orgs = await Org.find({ 'username': { $in: user.following } });
  } catch {err => {throw(err); }}

  res.render('following', {
    title: 'ChanceMap | Following',
    currentAcc: user,
    account_type: account_type,
    account_id: account_id,
    criteriaList: user.interests.concat(user.skills),
    orgs: orgs,
    notis: req.notis
  });
});

// Exports
module.exports = router;