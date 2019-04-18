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
const Admin = require('../models/admin');
const OrgPage = require('../models/org_page');
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
	let orgUsername = req.params.username;

	if (account_type == 1)
	{
		Org.findOne({'_id': account_id}, (err, user) => {
			Org.findOne({'username': orgUsername}, (err, org) => {
				Org.find({'_id': {$ne: org._id}}, (err, orgs) => {
					Job.find({'org_id': org._id}, (err, jobs) => {
						Event.find({'org_id': org._id}, (err, events) => {
							OrgPage.findOne({'org_id': org._id}, (err, page) => {
								orgs.forEach(similarOrg => {
									similarOrg.matches = 0;
									similarOrg.hashtags.forEach(hashtag => {
										org.hashtags.forEach(criteria => {
											if (hashtag.includes(criteria)) {
												similarOrg.matches++;
											}
										});				
									});
								});
								orgs.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
								res.render('orgs/page', {
									title: org.name,
									account_type: account_type,
									account_id: account_id,
									org: org,
									orgs: orgs,
									page: page,
									jobs: jobs,
									events: events,
									criteriaList: org.hashtags,
									currentAcc: user,
									notis: req.notis
								});
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
				Org.find({'_id': {$ne: org._id}}, (err, orgs) => {
					Job.find({'org_id': org._id}, (err, jobs) => {
						Event.find({'org_id': org._id}, (err, events) => {
							OrgPage.findOne({'org_id': org._id}, (err, page) => {
								orgs.forEach(similarOrg => {
									similarOrg.matches = 0;
									similarOrg.hashtags.forEach(hashtag => {
										org.hashtags.forEach(criteria => {
											if (hashtag.includes(criteria)) {
												similarOrg.matches++;
											}
										});				
									});
								});
								orgs.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
								res.render('orgs/page', {
									title: org.name,
									account_type: account_type,
									account_id: account_id,
									org: org,
									page: page,
									orgs: orgs,
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
		});
	}
});

router.get('/:username/edit', (req, res) => {
	const account_id = req.user.account_id;
	const account_type = req.user.account_type;

	Org.findOne({'username': req.params.username}, (err, org) => {
		if (req.user.username.toString() != org.username) {
			res.redirect('/');
		}
		else {
			OrgPage.findOne({'org_id': org._id}, (err, page) => {
				res.render('orgs/pageEdit', {
					title: org.name + ' ' + ' Edit',
					account_type: account_type,
					account_id: account_id,
					currentAcc: org,
					page: page,
					notis: req.notis,
					criteriaList: org.hashtags
				});
			});
		}
	});

});

router.post('/:username/edit', upload.single(), (req, res) => {
	let data = req.body;
	const currentAcc = req.user;

	Org.findOne({'username': req.params.username}, (err, org) => {
		if (currentAcc.username.toString() != org.username) {
			res.redirect('/');
		}
	});

	console.log('POST on /orgs/' + currentAcc.username + '/edit');

	Org.findOne({'username': currentAcc.username}, (err, org) => {
		if(err) {
			res.send('Database error...');
			console.log(err);
			return;
		}
		OrgPage.findOne({'org_id': org._id}, (err, page) => {
			if (page != null) {

				page.what_we_do = data.what_we_do;
				page.our_team = data.our_team;
				if(!page.created_at) {
					orgPage.created_at = new Date();
				}
				page.updated_at = new Date();

				page.save().then(result => {
					console.log(result);
					res.redirect('/orgs/' + org.username);
				}).catch(err => {
					res.send(err);
				});

			}
			else
			{
				var newOrgPage = new OrgPage({
				  _id: new mongoose.Types.ObjectId(),
					created_at: new Date(),
					updated_at: new Date(),
					org_id : org._id,
					org_name: org.name,
					what_we_do: data.what_we_do, //contain description of org
					our_team: data.our_team, //contain description of org's team
				});
				newOrgPage.save((err, page) => {
					if(err) {
						console.log(err);
						return;
					}
					console.log("New org profile made!");
					console.log(page);
					res.redirect('/orgs/' + org.username);
				});
			}
		});
	});
});

// Exports
module.exports = router;
