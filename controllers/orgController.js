const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Grid = require('gridfs-stream');

// Models
const Account = require('../models/account');
const Event = require('../models/event');
const User = require('../models/user');
const Job = require('../models/job');
const Org = require('../models/org');
const Admin = require('../models/admin');
const OrgProfile = require('../models/orgProfile');
const Message = require('../models/message');

// Database connection
const connection = mongoose.connection;

// Init gfs
let gfs;
connection.once('open', () => {
	// Init stream
	gfs = Grid(connection.db, mongoose.mongo);
	gfs.collection('uploads.files');
});


// @Routes
//View dashboard
router.get('/', (req, res) => {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
	} else {
		let account_type = req.user.account_type;
		let account_id = req.user.account_id;
		let criteriaList;

		Org.find((err, orgs) => {
			if (err) {
				console.log(err);
				return;
			}
			if (account_type == 1) {
				Org.findOne({ '_id': account_id }, (err, org) => {
					criteriaList = org.hashtags;
					orgs.forEach(org => {
						org.matches = 0;
						org.hashtags.forEach(hashtag => {
							criteriaList.forEach(criteria => {
								if (hashtag.includes(criteria)) {
									org.matches++;
								}
							});
						});
					});
					orgs.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
					Job.find({ 'org_id': { $ne: account_id } }, (err, jobs) => {
						Event.find({ 'org_id': { $ne: account_id } }, (err, events) => {
							User.find((err, users) => {
								Message.find((err, messages) => {
									let currentAcc = org;
									let followers = users.filter(user => currentAcc.followers.indexOf(user.username) >= 0);
									res.render('orgs/dashboard', {
										title: 'ChanceMap | Orgs',
										account_type: account_type,
										account_id: account_id,
										currentAcc: currentAcc,
										orgs: orgs,
										jobs: jobs,
										events: events,
										connected: followers,
										messages: messages,
										users: users,
										criteriaList: criteriaList,
										notis: req.notis
									});
								});
							});
						});
					});
				});
			}
			else if (account_type == 2) {
				Admin.findOne({ '_id': account_id }, (err, admin) => {
					criteriaList = [];
					orgs.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
					Job.find({ 'org_id': { $ne: account_id } }, (err, jobs) => {
						Event.find({ 'org_id': { $ne: account_id } }, (err, events) => {
							User.find((err, users) => {
								Message.find((err, messages) => {
									res.render('orgs/dashboard', {
										title: 'ChanceMap | Orgs',
										account_type: account_type,
										account_id: account_id,
										currentAcc: admin,
										orgs: orgs,
										jobs: jobs,
										events: events,
										messages: messages,
										users: users,
										criteriaList: criteriaList,
										notis: req.notis
									});
								});
							});
						});
					});
				});
			}
			else {
				User.findOne({ '_id': account_id }, (err, user) => {
					criteriaList = user.interests.concat(user.skills);
					orgs.forEach(org => {
						org.matches = 0;
						org.hashtags.forEach(hashtag => {
							criteriaList.forEach(criteria => {
								if (hashtag.includes(criteria)) {
									org.matches++;
								}
							});
						});
					});
					orgs.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
					Job.find((err, jobs) => {
						Event.find({ 'org_id': { $ne: account_id } }, (err, events) => {
							User.find((err, users) => {
								Message.find((err, messages) => {
									let currentAcc = user;
									let connected = users.filter(user => currentAcc.connected.indexOf(user.username) >= 0);
									res.render('orgs/dashboard', {
										title: 'ChanceMap | Orgs',
										account_type: account_type,
										account_id: account_id,
										currentAcc: currentAcc,
										orgs: orgs,
										users: users,
										connected: connected,
										messages: messages,
										jobs: jobs,
										events: events,
										criteriaList: criteriaList,
										notis: req.notis,
									});
								});
							});
						});
					});
				});
			}
		});
	}
});

//View Org Profiles
router.get('/:username', (req, res) => {
	let account_type = req.user.account_type;
	let account_id = req.user.account_id;
	let orgUsername = req.params.username;

	if (account_type == 1) {
		Org.findOne({ '_id': account_id }, (err, user) => {
			Org.findOne({ 'username': orgUsername }, (err, org) => {
				Org.find({ '_id': { $ne: org._id } }, (err, orgs) => {
					Job.find({ 'org_id': org._id }, (err, jobs) => {
						Event.find({ 'org_id': org._id }, (err, events) => {
							OrgProfile.findOne({ 'org_id': org._id }, (err, profile) => {
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
								User.find((err, users) => {
									Message.find((err, messages) => {
										let currentAcc = user;
										let followers = users.filter(user => currentAcc.followers.indexOf(user.username) >= 0);
										res.render('orgs/profile', {
											title: org.name,
											account_type: account_type,
											account_id: account_id,
											org: org,
											orgs: orgs,
											profile: profile,
											connected: followers,
											users: users,
											messages: messages,
											jobs: jobs,
											events: events,
											criteriaList: org.hashtags,
											currentAcc: currentAcc,
											notis: req.notis
										});
									});
								});
							});
						});
					});
				});
			});
		});
	}
	else {
		User.findOne({ '_id': account_id }, (err, user) => {
			Org.findOne({ 'username': orgUsername }, (err, org) => {
				Org.find({ '_id': { $ne: org._id } }, (err, orgs) => {
					Job.find({ 'org_id': org._id }, (err, jobs) => {
						Event.find({ 'org_id': org._id }, (err, events) => {
							OrgProfile.findOne({ 'org_id': org._id }, (err, profile) => {
								console.log(profile);
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
								User.find((err, users) => {
									Message.find((err, messages) => {
										let currentAcc = user;
										let connected = users.filter(user => currentAcc.connected.indexOf(user.username) >= 0);
										res.render('orgs/profile', {
											title: org.name,
											account_type: account_type,
											account_id: account_id,
											org: org,
											profile: profile,
											orgs: orgs,
											messages: messages,
											connected: connected,
											users: users,
											jobs: jobs,
											events: events,
											criteriaList: user.interests.concat(user.skills),
											currentAcc: currentAcc,
											notis: req.notis
										});
									});
								});
							});
						});
					});
				});
			});
		});
	}
});

//View Followers
router.get('/:orgname/followers', async (req, res) => {

	let account_type = req.user.account_type;
	let account_id = req.user.account_id;
	let orgname = req.params.orgname;

	if (account_type != 1 || orgname != req.user.username) {
		res.redirect('/');
	}

	let org = await Org.findOne({ 'username': orgname });
	let users = await User.find({ 'username': { $in: org.followers } });

	res.render('followers', {
		title: 'ChanceMap | Followers',
		currentAcc: org,
		account_type: account_type,
		account_id: account_id,
		criteriaList: org.hashtags,
		users: users,
		notis: req.notis
	});
});


// Exports
module.exports = router;
