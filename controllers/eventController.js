const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');

const Event = require('../models/event');
const Org = require('../models/org');
const User = require('../models/user');

// creating a new-event page
router.get('/events/create', (req, res) => {
    let account_type = req.user.account_type;
    let account_id = req.user.account_id;
    if(account_type == 1) {    
        Org.findOne({'_id': account_id}, (err, org) => {
            res.render('Events/Org/create', {
                title: 'App Dao | Create Event',
                account_type: account_type,
                account_id: account_id,
                currentAcc: org
            });
        });
    }
});

// viewing my own events
router.get('/events/view', (req, res) => {
    let account_type = req.user.account_type;
    let account_id = req.user.account_id;
    if(account_type == 0) {
        User.findOne({'_id': account_id}, (err, user) => {
            res.render('Events/User/view', {
                title: 'App Dao | View Event',
                account_type: account_type,
                account_id: account_id,
                currentAcc: user
            });
        });
    } else {
        Org.findOne({'_id': account_id}, (err, org) => {
            res.render('pages/index', {
                title: 'App Dao | Create Event',
                account_type: account_type,
                account_id: account_id,
                currentAcc: org
            });
        });
    }
});

// viewing others' events
router.get('events/', (req, res) => {
    let account_type = req.user.account_type;
    let account_id = req.user.account_id;
    if(account_type == 0) {
        User.findOne({'_id': account_id}, (err, user) => {
            res.render('pages/index', {
                title: 'App Dao | View Event',
                account_type: account_type,
                account_id: account_id,
                currentAcc: user
            });
        });
    } else {
        Org.findOne({'_id': account_id}, (err, org) => {
            res.render('pages/index', {
                title: 'App Dao | Create Event',
                account_type: account_type,
                account_id: account_id,
                currentAcc: org
            });
        });
    }
})

router.post('/', (req, res) => {
    console.log(req.body);

    let data = req.body;
    let name = data.name;
    let org_id = currentAcc._id;
    let org_name = data.org_name;
    let desc = data.desc;
    let hashtags = data.hashtags;
    let address = data.address;
    let reg_form = data.reg_form;
    let reg_deadline = data.reg_deadline;
    let date = data.date;
    let start_time = data.start_time;
    let end_time = data.end_time;
    let facebook = data.facebook;
    let website = data.website;
    let eventImage = data.eventImage;

    var newEvent = new Event({
        _id: new mongoose.Types.ObjectId(),
        name: name,
        org_name: org_name,
        desc: desc,
        hashtags: hashtags,
        address: address,
        reg_form: reg_form,
        reg_deadline: reg_deadline,
        start_time: start_time,
        end_time: end_time,
        facebook: facebook,
        website: website,
        eventImage: eventImage
    });
    newEvent.save((err, event) => {
        if(err) {
            console.log(err);
            return
        }
        console.log(event);
    });
});

module.exports = router;








