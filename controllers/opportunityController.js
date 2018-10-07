const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const config = require('../config/database.js');

const Opportunity = require('../models/opportunity');
const Org = require('../models/org');
const User = require('../models/user');
const Admin = require('../models/admin');
const Event = require('../models/event');


// Database connection
const connection = mongoose.connection;

//opportunitiesdashboard
router.get('/', (req, res) => {
  if(!req.isAuthenticated()) {
    res.redirect('/login');
  } else {
    let account_type = req.user.account_type;
    let account_id = req.user.account_id;
    Opportunity.find((err, opportunities) => {
        if(err) {
          console.log(err);
          return;
        }
        if(account_type == 1) {
            Org.findOne({'_id': account_id}, (err, org) => {
                let criteriaList = org.hashtags;
                opportunities.forEach(opportunity => {
                    opportunity.matches = 0;
                    opportunity.hashtags.forEach(hashtag => {
                        criteriaList.forEach(criteria => {
                            if(hashtag.includes(criteria)) {
                            opportunity.matches++;
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
        } else if (account_type == 2) {
          Admin.findOne({'_id': account_id}, (err, admin) => {
              let criteriaList = [];
              res.render('opportunities/dashboard', {
                  title: 'ChanceMap | Opportunities',
                  account_type: account_type,
                  account_id: account_id,
                  currentAcc: admin,
                  opportunities: opportunities,
                  criteriaList: criteriaList,
                  notis: req.notis
              });
          });
        }else {
            User.findOne({'_id': account_id}, (err, user) => {
                let criteriaList = user.interests.concat(user.skills);
                opportunities.forEach(opportunity => {
                    opportunity.matches = 0;
                    opportunity.hashtags.forEach(hashtag => {
                        criteriaList.forEach(criteria => {
                            if(hashtag.includes(criteria)) {
                            opportunity.matches++;
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

// edit an existing job
router.get('/manage/edit/:ID', (req, res) => {
	if(!req.isAuthenticated()) {
		res.redirect('/login');
	} else {
		let account_type = req.user.account_type;
		let account_id = req.user.account_id;
		let event_id = req.params.id;
		Opportunity.findOne({_id: req.params.ID}, (err, opportunity) => {
				if(err) {
						console.log(err);
						return;
				}
				if (account_type == 1 ) {
					Org.findOne({_id: req.user.account_id}, (err, org) => {
						res.render('opportunities/edit', {
							title: 'ChanceMap | Edit Opportunity',
							account_type: req.user.account_type,
							account_id: req.user.account_id,
							currentAcc: org,
							opportunity: opportunity,
							notis: req.notis
						});
					});
				} else if ( account_type == 2){
					Admin.findOne({_id: req.user.account_id}, (err, admin) => {
						res.render('opportunities/edit', {
							title: 'ChanceMap | Edit Opportunity',
							account_type: req.user.account_type,
							account_id: req.user.account_id,
							currentAcc: admin,
							opportunity: opportunity,
							notis: req.notis
						});
					});
				}
		});
	}
});

// Exports
module.exports = router;
