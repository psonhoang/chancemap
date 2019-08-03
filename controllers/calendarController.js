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
        await User.findOne({ '_id': account_id }).exec().then(user => {
            currentAcc = user;
            connected = users.filter(client => user.connected.indexOf(client.username) >= 0);
            criteriaList = user.interests.concat(user.skills);
        }, console.log(err));
    }
    else if (account_type == 1) {
        await Org.findOne({ '_id': account_id }).exec().then(org => {
            currentAcc = org;
            connected = users.filter(user => org.followers.indexOf(user.username) >= 0);
            criteriaList = org.hashtags;
        });
    }
    else {
        await Admin.findOne({ '_id': account_id }).exec().then(admin => {
            currentAcc = admin;
            connected = [];
            criteriaList = [];
        });
    }

    // render page
    res.render('calendar', {
        title: 'ChanceMap | Home',
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
