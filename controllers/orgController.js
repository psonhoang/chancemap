const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const config = require('../config/database.js');
// For file uploading
const crypto = require('crypto');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');

// Models
const Account = require('../models/account');
const Event = require('../models/event');
const User = require('../models/user');
const Job = require('../models/job');
const Org = require('../models/org');
const OrgProfile = require('../models/org_profile');
const Admin = require('../models/admin');
// Database connection
const connection = mongoose.connection;

// Init gfs
let gfs;
connection.once('open', () => {
	// Init stream
	gfs = Grid(connection.db, mongoose.mongo);
	gfs.collection('uploads.files');
});

// Create storage engine
const storage = new GridFsStorage({
  url: config.database,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });


// @Routes
router.get('/', (req, res) => {
	if(!req.isAuthenticated()) {
		res.redirect('/login');
	} else {
	  let account_type = req.user.account_type;
	  let account_id = req.user.account_id;
	  let criteriaList;
	  Org.find((err, orgs) => {
	    if(err) {
	      console.log(err);
	      return;
	    }
	    if(account_type == 1) {
	      Org.findOne({'_id': account_id}, (err, org) => {
	        criteriaList = org.hashtags;
	        orgs.forEach(org => {
	          org.matches = 0;
	          org.hashtags.forEach(hashtag => {
	            criteriaList.forEach(criteria => {
	              if(hashtag.includes(criteria)) {
	                org.matches++;
	              }
	            });
	          });
	        });
					orgs.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
					Job.find({'org_id': {$ne: account_id}}, (err, jobs) => {
						Event.find({'org_id': {$ne: account_id}}, (err, events) => {
							res.render('orgs/dashboard', {
								title: 'ChanceMap | Orgs',
								account_type: account_type,
								account_id: account_id,
								currentAcc: org,
								orgs: orgs,
								jobs: jobs,
								events: events,
								criteriaList: criteriaList,
								notis: req.notis
							});
						});
	        });
	      });
			}
			else if (account_type == 2){
				Admin.findOne({'_id': account_id}, (err, admin) => {
					criteriaList = [];
					orgs.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
					Job.find({'org_id': {$ne: account_id}}, (err, jobs) => {
						Event.find({'org_id': {$ne: account_id}}, (err, events) => {
							res.render('orgs/dashboard', {
								title: 'ChanceMap | Orgs',
								account_type: account_type,
								account_id: account_id,
								currentAcc: admin,
								orgs: orgs,
								jobs: jobs,
								events: events,
								criteriaList: criteriaList,
								notis: req.notis
							});
						});
					});
				});
			}
			else
			{
	      User.findOne({'_id': account_id}, (err, user) => {
					criteriaList = user.interests.concat(user.skills);
					orgs.forEach(org => {
						org.matches = 0;
						org.hashtags.forEach(hashtag => {
							criteriaList.forEach(criteria => {
								if(hashtag.includes(criteria)) {
									org.matches++;
								}
							});
						});
					});
					orgs.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
					Job.find({}, (err, jobs) => {
						Event.find({'org_id': {$ne: account_id}}, (err, events) => {
							res.render('orgs/dashboard', {
								title: 'ChanceMap | Orgs',
								account_type: account_type,
								account_id: account_id,
								currentAcc: user,
								orgs: orgs,
								jobs: jobs,
								events: events,
								criteriaList: criteriaList,
								notis: req.notis
							});
						});
					});
	      });
	    }
	  });
	}
});

router.get('/:username', (req, res) => {
	let account_type = req.user.account_type;
	let account_id = req.user.account_id;
	let criteriaList;
	var thisUser;
	let orgUsername = req.params.username;

	if (account_type == 1)
	{
		Org.findOne({'_id': account_id}, (err, user) => {
			Org.findOne({'username': orgUsername}, (err, org) => {
				Job.find({'org_id': org._id}, (err, jobs) => {
					Event.find({'org_id': org._id}, (err, events) => {
						OrgProfile.find({'org_id': org._id}, (err, orgProfile) => {
							res.render('orgs/profile', {
								title: org.name,
								account_type: account_type,
								account_id: account_id,
								org: org,
								orgProfile: orgProfile,
								jobs: jobs,
								events: events,
								criteriaList: user.hashtags,
								currentAcc: user,
								notis: req.notis
							});
						});
					});
				});
			});
		});
	}
	else
	{
		User.findOne({'_id': account_id}, (err, user) => {
			Org.findOne({'username': orgUsername}, (err, org) => {
				Job.find({'org_id': org._id}, (err, jobs) => {
					Event.find({'org_id': org._id}, (err, events) => {
						OrgProfile.find({'org_id': org._id}, (err, orgProfile) => {
							res.render('orgs/profile', {
								title: org.name,
								account_type: account_type,
								account_id: account_id,
								org: org,
								orgProfile: orgProfile,
								jobs: jobs,
								events: events,
								criteriaList: user.interests.concat(user.skills),
								currentAcc: user,
								notis: req.notis
							});
						});
					});
				});
			});
		});
	}
});

// Exports
module.exports = router;
