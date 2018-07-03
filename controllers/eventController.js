const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const path = require('path');
const config = require('../config/database.js');
const bodyParser = require('body-parser');

const Event = require('../models/event');
const Org = require('../models/org');
const User = require('../models/user');

// Database connection
const connection = mongoose.connection;

// creating a new event
router.get('/create', (req, res) => {
    let account_type = req.user.account_type;
    let account_id = req.user.account_id;
    if(account_type == 1) {
        Org.findOne({'_id': account_id}, (err, org) => {
            res.render('events/orgs/create', {
                title: 'App Dao | Create Event',
                account_type: account_type,
                account_id: account_id,
                currentAcc: org
            });
        });
    }
});

// editing existing events 
router.get('/edit/:id', (req, res) => {
    let account_type = req.user.account_type;
    let account_id = req.user.account_id;
    if(account_type == 1) {
        let event_id = req.params.id;
        Event.findOne({_id: event_id}, (err, event) => {
            if(err) {
                console.log(err);
                return;
            }
            if(account_type == 1) {
                Org.findOne({'_id': account_id}, (err, org) => {
                    res.render('events/orgs/edit', {
                        title: 'App Dao | My Events',
                        account_type: account_type,
                        account_id: account_id,
                        currentAcc: org,
                        event: event
                    })
                })
            } else {
                res.redirect('/');
            }        
        })  
    } else {
        res.redirect('/');
    }
})

// viewing my own events
router.get('/view', (req, res) => {
    let account_type = req.user.account_type;
    let account_id = req.user.account_id;
    Event.find((err, events) => {
        if(err) {
          console.log(err);
          return;
        }
        if(account_type == 0) {
            User.findOne({'_id': account_id}, (err, user) => {
                res.render('events/users/view_cards', {
                    title: 'App Dao | My Events',
                    account_type: account_type,
                    account_id: account_id,
                    currentAcc: user,
                    events: events
                });
            });
        } else {
            Org.findOne({'_id': account_id}, (err, org) => {
                res.render('events/users/view_cards', {
                    title: 'App Dao | My Events',
                    account_type: account_type,
                    account_id: account_id,
                    currentAcc: org,
                    events: events
                });
            });
        }  
    }) 
});

router.post('/create', (req, res) => {
    let data = req.body;
    let name = data.name;
    let org_id = req.user.account_id;
    let org_name = data.org_name;
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
        res.redirect('/events/create')
    });
});

// editing existing events
router.post('/edit/:id', (req, res) => {
    let data = req.body;
    let event_id = req.params.id;
    Event.findOne({_id: event_id}, (err, event) => {
		if(err) {
			res.send('Database error...');
			console.log(err);
			return;
        }
        console.log(event);
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
            res.redirect('/events');
        }).catch(err => {
            res.send(err);
        });
    });
});    

module.exports = router;
