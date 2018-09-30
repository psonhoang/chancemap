const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const config = require('../config/database.js');

const Opportunities = require('../models/opportunities');
const Org = require('../models/org');
const User = require('../models/user');
const Event = require('../models/event');

//opportunitiesdashboard
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
                opportunities.forEach(event => {
                    opportunities.matches = 0;
                    opportunities.hashtags.forEach(hashtag => {
                        criteriaList.forEach(criteria => {
                            if(hashtag.includes(criteria)) {
                            opportunities.matches++;
                            }
                        });
                    });
                });
                opportunities.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
                res.render('opportunities/dashboard', {
                    title: 'ChanceMap | Opportunities',
                    account_type: account_type,
                    account_id: account_id,
                    currentAcc: org,
                    opportunities: opportunities,
                    criteriaList: criteriaList,
                    notis: req.notis
                });
            });
        } else {
            User.findOne({'_id': account_id}, (err, user) => {
                let criteriaList = user.interests.concat(user.skills);
                opportunities.forEach(event => {
                    opportunities.matches = 0;
                    opportunities.hashtags.forEach(hashtag => {
                        criteriaList.forEach(criteria => {
                            if(hashtag.includes(criteria)) {
                            opportunities.matches++;
                            }
                        });
                    });
                });
                opportunities.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
                res.render('opportunities/dashboard', {
                    title: 'ChanceMap | Opportunities',
                    account_type: account_type,
                    account_id: account_id,
                    currentAcc: user,
                    opportunities: opportunities,
                    criteriaList: criteriaList,
                    notis: req.notis
                });
            });
        }
    });
  }
});
// Exports
module.exports = router;
