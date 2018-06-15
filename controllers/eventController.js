const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Event = require('../models/event');

// creating a new event
router.get('/new', (req, res) => {
    res.render('new', {title: "Code Dao | New Event"});
});

router.post('/new', (req, res) => {
    console.log(req.body);

    let data = req.body;
    let name = data.name;
    let org_id = req.user.account_id;
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
        org_id: org_id,
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









