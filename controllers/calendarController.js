const express = require('express');
const router = express.Router();

const Admin = require('../models/admin');
const User = require('../models/user');
const Org = require('../models/org');
const Event = require('../models/event');
const Job = require('../models/job');
const Opportunity = require('../models/opportunity');

// @Routes
// @GET '/calendar'
router.get('/', async (req, res) => {

    let account_type = req.user.account_type;
    let account_id = req.user.account_id;

    var connected;
    var criteriaList;

    let opportunities = await Opportunity.find();
    let events = await Event.find();
    let orgs = await Org.find();
    let jobs = await Job.find();
    let users = await User.find();

    //find appropriate account, set the right criterial list and connected list
    if (account_type == 0) {
        currentAcc = users.filter(user => JSON.stringify(user._id) == JSON.stringify(account_id))[0];
        connected = users.filter(client => currentAcc.connected.indexOf(client.username) >= 0);
        criteriaList = currentAcc.interests.concat(currentAcc.skills);
    }
    else if (account_type == 1) {
        currentAcc = orgs.filter(org => JSON.stringify(org._id) == JSON.stringify(account_id))[0];
        connected = users.filter(user => currentAcc.followers.indexOf(user.username) >= 0);
        criteriaList = currentAcc.hashtags;
    }
    else {
        if (req.user.username != "Guest") {
            currentAcc = await Admin.findOne({ '_id': account_id });
        } else {
            currentAcc = users.filter(user => JSON.stringify(user._id) == JSON.stringify(account_id))[0];
        }
        connected = [];
        criteriaList = [];
    }

    // render page
    res.render('calendar', {
        title: 'ChanceMap | Calendar',
        account_type: account_type,
        account_id: account_id,
        currentAcc: currentAcc,
        events: events,
        jobs: jobs,
        orgs: orgs,
        users: users,
        opportunities: opportunities,
        criteriaList: criteriaList,
        notis: req.notis,
        connected: connected,
    });
});

module.exports = router;
