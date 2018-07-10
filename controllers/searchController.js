const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const config = require('../config/database.js');
// For file uploading
const crypto = require('crypto');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');

// Models
const Account = require('../models/account');
const User = require('../models/user');
const Org = require('../models/org');
const Job = require('../models/job');
const Event = require('../models/event');

// Database connection
const connection = mongoose.connection;

// Init gfs
let gfs;
connection.once('open', () => {
	// Init stream
	gfs = Grid(connection.db, mongoose.mongo);
	gfs.collection('uploads');
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

// *** ROUTES ***

router.get('/', (req, res) => {
  	console.log(req.query.criteriaList);
	let criteriaList = req.query.criteriaList;
	let currentAcc = req.user;
	console.log(currentAcc);
	Event.find((err, events) => {
		if(err) {
			console.log(err);
			return;
		}
		console.log("Events: " + events.length);
		var sortedEvents = [];
		events.forEach(event => {
			event.matches = 0;
			event.hashtags.forEach(hashtag => {
				criteriaList.forEach(criteria => {
					if(hashtag.includes(criteria)) {
						event.matches++;
					}
				});
			});
			if(event.matches > 0) {
				// let index = events.indexOf(event);
				// if(index != -1) {
				// 	events.splice(index, 1);
				// }
				sortedEvents.push(event);
			}
			console.log(event.matches);
		});
		sortedEvents.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
		Job.find((err, jobs) => {
			if(err) {
				console.log(err);
				return;
			}
			console.log("Jobs: " + jobs.length);
			var sortedJobs = [];
			jobs.forEach(job => {
				job.matches = 0;
				job.hashtags.forEach(hashtag => {
					criteriaList.forEach(criteria => {
						if(hashtag.includes(criteria)) {
							job.matches++;
						}
					});
				});
				if(job.matches > 0) {
					// let index = jobs.indexOf(job);
					// if(index != -1) {
					// 	jobs.splice(index, 1);
					// }
					sortedJobs.push(job);
				}
				console.log(job.matches);
			});
			sortedJobs.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
			Org.find((err, orgs) => {
				if(err) {
					console.log(err);
					return;
				}
				console.log("Orgs: " + orgs.length);
				var sortedOrgs = [];
				orgs.forEach(org => {
					org.matches = 0;
					org.hashtags.forEach(hashtag => {
						criteriaList.forEach(criteria => {
							if(hashtag.includes(criteria)) {
								org.matches++;
							}
						});
					});
					if(org.matches > 0) {
						// let index = orgs.indexOf(org);
						// if(index != -1) {
						// 	orgs.splice(org, 1);
						// }
						sortedOrgs.push(org);
					}
					console.log(org.matches);
				});
				sortedOrgs.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
				User.find((err, users) => {
					if(err) {
						console.log(err);
						return;
					}
					console.log("Users: " + users.length);
					var sortedUsers = [];
					users.forEach(user => {
						user.matches = 0;
						let hashtags = user.interests.concat(user.skills);
						hashtags.forEach(hashtag => {
							criteriaList.forEach(criteria => {
								if(hashtag.includes(criteria)) {
									user.matches++;
								}
							});
						});
						if(user.matches > 0) {
							// let index = users.indexOf(user);
							// if(index != -1) {
							// 	users.splice(user, 1);

							// }
							sortedUsers.push(user);
						}
						console.log(user.matches);
					});
					sortedUsers.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
					if(currentAcc.account_type == 1) {
						Org.findOne({'_id': currentAcc.account_id}, (err, org) => {
							if(err) {
								console.log(err);
							}
							console.log(org);
							res.render('index', {
								title: 'App Dao | Search',
								events: sortedEvents,
								jobs: sortedJobs,
								orgs: sortedOrgs,
								users: sortedUsers,
								criteriaList: criteriaList,
								account_type: currentAcc.acount_type,
								account_id: currentAcc.account_id,
								currentAcc: org
							});
						});
					} else {
						User.findOne({'_id': currentAcc.account_id}, (err, user) => {
							if(err) {
								console.log(err);
							}
							console.log(user);
							res.render('index', {
								title: 'App Dao | Search',
								events: sortedEvents,
								jobs: sortedJobs,
								orgs: sortedOrgs,
								users: sortedUsers,
								criteriaList: criteriaList,
								account_type: currentAcc.acount_type,
								account_id: currentAcc.account_id,
								currentAcc: user
							});
						});
					}
					
				});
			});
		});
	});
});

// Exports
module.exports = router;
