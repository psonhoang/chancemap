const express = require('express');
const router = express.Router();

const Admin = require('../models/admin');
const User = require('../models/user');
const Org = require('../models/org');
const Event = requrie('../models/event');
const Job = require('../models/job');
const Opportunitiy = require('../models/opportunity');

// @Routes
// @GET '/calendar'
router.get('/', (req, res) => {
    let account_type = req.user.account_type;
    let account_id = req.user.account_id;
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
                        res.render('calendar', {
                            title: "ChanceMap | Calendar",
                            account_type: req.user.account_type,
                            account_id: req.user.account_id,
                            currentAcc: user,
                            events: events,
                            jobs: jobs,
                            opportunities: opportunities,
                            notis: req.notis
                        });
                    });
                } else if(account_type == 1) {
                    Org.findOne({'_id': account_id}, (err, org) => {
                        res.render('calendar', {
                            title: "ChanceMap | Calendar",
                            account_type: req.user.account_type,
                            account_id: req.user.account_id,
                            currentAcc: org,
                            events: events,
                            jobs: jobs,
                            opportunities: opportunities,
                            notis: req.notis
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
                            notis: req.notis
                        });
                    });
                }
            })
        });
    });
});

module.exports = router;