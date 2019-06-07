const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
// const path = require('path');
// const bcrypt = require('bcryptjs');
// const passport = require('passport');
// const config = require('../config/database.js');
// // For file uploading
// const crypto = require('crypto');
// const multer = require('multer');
// const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');

// Models
const Account = require('../models/account');
const User = require('../models/user');
const Org = require('../models/org');
const Job = require('../models/job');
const Event = require('../models/event');
const Opportunity = require('../models/opportunity');
const Message = require('../models/message');

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
// const storage = new GridFsStorage({
// 	url: config.database,
// 	file: (req, file) => {
// 		return new Promise((resolve, reject) => {
// 			crypto.randomBytes(16, (err, buf) => {
// 				if (err) {
// 					return reject(err);
// 				}
// 				const filename = buf.toString('hex') + path.extname(file.originalname);
// 				const fileInfo = {
// 					filename: filename,
// 					bucketName: 'uploads'
// 				};
// 				resolve(fileInfo);
// 			});
// 		});
// 	}
// });
// const upload = multer({ storage });

// *** ROUTES ***

// @Routes: /search/orgs
router.get('/orgs', (req, res) => {
	// console.log(req.query.criteriaList);
	let criteriaList = req.query.criteriaList;
	let currentAcc = req.user;
	// console.log(currentAcc);
	Message.find((err, messages) => {
		Org.find((err, orgs) => {
			if (err) {
				console.log(err);
				return;
			}
			console.log("Orgs: " + orgs.length);
			var sortedOrgs = [];
			orgs.forEach(org => {
				org.matches = 0;
				criteriaList.forEach(criteria => {
					if (org.username.toLowerCase().includes(criteria) || org.name.toLowerCase().includes(criteria)) {
						org.matches++;
					}
					org.hashtags.forEach(hashtag => {
						if (hashtag.includes(criteria)) {
							org.matches++;
						}
					});
				});
				if (org.matches > 0) {
					sortedOrgs.push(org);
				}
			});
			sortedOrgs.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
			User.find((err, users) => {
				if (err) {
					console.log(err);
					return;
				}
				if (currentAcc.account_type == 1) {
					Org.findOne({ '_id': currentAcc.account_id }, (err, org) => {
						if (err) {
							console.log(err);
						}
						// console.log(org);
						const followers = users.filter(user => org.followers.indexOf(user.username) >= 0);
						res.render('orgs/dashboard', {
							title: 'ChanceMap | Orgs',
							orgs: sortedOrgs,
							criteriaList: criteriaList,
							account_type: currentAcc.account_type,
							account_id: currentAcc.account_id,
							currentAcc: org,
							notis: req.notis,
							messages: messages,
							connected: followers,
							users: users
						});
					});
				} else {
					User.findOne({ '_id': currentAcc.account_id }, (err, user) => {
						if (err) {
							console.log(err);
						}
						// console.log(user);
						const connected = users.filter(client => user.connected.indexOf(client.username) >= 0);
						if (req.query.isFollowing) {
							const following = sortedOrgs.filter(org => user.following.indexOf(org.username) >= 0);
							res.render('following', {
								title: 'ChanceMap | Following',
								orgs: following,
								criteriaList: criteriaList,
								account_type: currentAcc.account_type,
								account_id: currentAcc.account_id,
								currentAcc: user,
								notis: req.notis,
								messages: messages,
								connected: connected,
								users: users
							});
						} else {
							res.render('orgs/dashboard', {
								title: 'ChanceMap | Orgs',
								orgs: sortedOrgs,
								criteriaList: criteriaList,
								account_type: currentAcc.account_type,
								account_id: currentAcc.account_id,
								currentAcc: user,
								notis: req.notis,
								messages: messages,
								connected: connected,
								users: users
							});
						}
					});
				}
			});
		});
	})
});

// @Routes: /search/users
router.get('/users', (req, res) => {
	// console.log(req.query.criteriaList);
	let criteriaList = req.query.criteriaList;
	let currentAcc = req.user;
	// console.log(currentAcc);
	Message.find((err, messages) => {
		if (err) {
			console.log(err);
			return;
		}
		User.find((err, users) => {
			if (err) {
				console.log(err);
				return;
			}
			console.log("Users: " + users.length);
			var sortedUsers = [];
			users.forEach(user => {
				if (user.username !== undefined && user.name !== undefined) {
					user.matches = 0;
					const hashtags = user.interests.concat(user.skills);
					criteriaList.forEach(criteria => {
						if (user.username.toLowerCase().includes(criteria) || user.name.toLowerCase().includes(criteria)) {
							user.matches++;
						}

						hashtags.forEach(hashtag => {
							if (hashtag.includes(criteria)) {
								user.matches++;
							}
						});
					});
					if (user.matches > 0) {
						sortedUsers.push(user);
					}
				}
			});
			sortedUsers.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
			if (currentAcc.account_type == 1) {
				Org.findOne({ '_id': currentAcc.account_id }, (err, org) => {
					if (err) {
						console.log(err);
						return;
					}
					// console.log(org);
					const followers = sortedUsers.filter(user => org.followers.indexOf(user.username) >= 0);
					if (req.query.isFollower) {
						res.render('followers', {
							title: 'ChanceMap | Followers',
							users: followers,
							criteriaList: criteriaList,
							account_type: currentAcc.account_type,
							account_id: currentAcc.account_id,
							currentAcc: org,
							notis: req.notis,
							messages: messages,
							connected: followers
						});
					} else {
						res.render('users/dashboard', {
							title: 'ChanceMap | Users',
							users: sortedUsers,
							criteriaList: criteriaList,
							account_type: currentAcc.account_type,
							account_id: currentAcc.account_id,
							currentAcc: org,
							notis: req.notis,
							messages: messages,
							connected: followers
						});
					}
				});
			} else {
				User.findOne({ '_id': currentAcc.account_id }, (err, user) => {
					if (err) {
						console.log(err);
						return;
					}
					// console.log(user);
					const connected = users.filter(client => user.connected.indexOf(client.username) >= 0);
					res.render('users/dashboard', {
						title: 'ChanceMap | Users',
						users: sortedUsers,
						criteriaList: criteriaList,
						account_type: currentAcc.account_type,
						account_id: currentAcc.account_id,
						currentAcc: user,
						notis: req.notis,
						messages: messages,
						connected: connected
					});
				});
			}
		});
	});
});

// @Routes: /search/jobs
router.get('/jobs', (req, res) => {
	// console.log(req.query.criteriaList);
	let criteriaList = req.query.criteriaList;
	let currentAcc = req.user;
	// console.log(currentAcc);
	Message.find((err, messages) => {
		Job.find((err, jobs) => {
			if (err) {
				console.log(err);
				return;
			}
			console.log("Jobs: " + jobs.length);
			var sortedJobs = [];
			jobs.forEach(job => {
				job.matches = 0;
				criteriaList.forEach(criteria => {
					if (job.org_name.toLowerCase().includes(criteria) || job.name.toLowerCase().includes(criteria)) {
						job.matches++;
					}
					job.hashtags.forEach(hashtag => {
						if (hashtag.includes(criteria)) {
							job.matches++;
						}
					});
				});
				if (job.matches > 0) {
					sortedJobs.push(job);
				}
			});
			sortedJobs.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
			User.find((err, users) => {
				if (err) {
					console.log(err);
					return;
				}
				if (currentAcc.account_type == 1) {
					Org.findOne({ '_id': currentAcc.account_id }, (err, org) => {
						if (err) {
							console.log(err);
						}
						// console.log(org);
						const followers = users.filter(user => org.followers.indexOf(user.username) >= 0);
						res.render('jobs/dashboard', {
							title: 'ChanceMap | Jobs',
							jobs: sortedJobs,
							criteriaList: criteriaList,
							account_type: currentAcc.account_type,
							account_id: currentAcc.account_id,
							currentAcc: org,
							notis: req.notis,
							messages: messages,
							users: users,
							connected: followers
						});
					});
				} else {
					User.findOne({ '_id': currentAcc.account_id }, (err, user) => {
						if (err) {
							console.log(err);
						}
						// console.log(user);
						const connected = users.filter(client => user.connected.indexOf(client.username) >= 0);
						res.render('jobs/dashboard', {
							title: 'ChanceMap | Jobs',
							jobs: sortedJobs,
							criteriaList: criteriaList,
							account_type: currentAcc.account_type,
							account_id: currentAcc.account_id,
							currentAcc: user,
							notis: req.notis,
							messages: messages,
							users: users,
							connected: connected
						});
					});
				}
			});
		});
	});
});

// @Routes: /search/events
router.get('/events', (req, res) => {
	// console.log(req.query.criteriaList);
	let criteriaList = req.query.criteriaList;
	let currentAcc = req.user;
	// console.log(currentAcc);
	Message.find((err, messages) => {
		Event.find((err, events) => {
			if (err) {
				console.log(err);
				return;
			}
			console.log("Events: " + events.length);
			var sortedEvents = [];
			events.forEach(event => {
				event.matches = 0;
				criteriaList.forEach(criteria => {
					if (event.org_name.toLowerCase().includes(criteria) || event.name.toLowerCase().includes(criteria)) {
						event.matches++;
					}
					event.hashtags.forEach(hashtag => {
						if (hashtag.includes(criteria)) {
							event.matches++;
						}
					});
				});
				if (event.matches > 0) {
					sortedEvents.push(event);
				}
			});
			sortedEvents.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
			User.find((err, users) => {
				if (err) {
					console.log(err);
					return;
				}
				if (currentAcc.account_type == 1) {
					Org.findOne({ '_id': currentAcc.account_id }, (err, org) => {
						if (err) {
							console.log(err);
						}
						// console.log(org);
						const followers = users.filter(user => org.followers.indexOf(user.username) >= 0);
						res.render('events/dashboard', {
							title: 'ChanceMap | Events',
							events: sortedEvents,
							criteriaList: criteriaList,
							account_type: currentAcc.account_type,
							account_id: currentAcc.account_id,
							currentAcc: org,
							notis: req.notis,
							users: users,
							messages: messages,
							connected: followers
						});
					});
				} else {
					User.findOne({ '_id': currentAcc.account_id }, (err, user) => {
						if (err) {
							console.log(err);
						}
						// console.log(user);
						const connected = users.filter(client => user.connected.indexOf(client.username) >= 0);
						res.render('events/dashboard', {
							title: 'ChanceMap | Events',
							events: sortedEvents,
							criteriaList: criteriaList,
							account_type: currentAcc.account_type,
							account_id: currentAcc.account_id,
							currentAcc: user,
							notis: req.notis,
							users: users,
							messages: messages,
							connected: connected
						});
					});
				}
			});
		});
	});
});

// @Routes /search/opportunities
router.get('/opportunities', (req, res) => {
	// console.log(req.query.criteriaList);
	let criteriaList = req.query.criteriaList;
	let currentAcc = req.user;
	// console.log(currentAcc);
	Message.find((err, messages) => {
		Opportunity.find((err, opportunities) => {
			if (err) {
				console.log(err);
				return;
			}
			console.log("Opportunities: " + opportunities.length);
			var sortedOpportunities = [];
			opportunities.forEach(opportunity => {
				opportunity.matches = 0;
				criteriaList.forEach(criteria => {
					if (opportunity.org_name.toLowerCase().includes(criteria) || opportunity.name.toLowerCase().includes(criteria)) {
						opportunity.matches++;
					}
					opportunity.hashtags.forEach(hashtag => {
						if (hashtag.includes(criteria)) {
							opportunity.matches++;
						}
					});
				});
				if (opportunity.matches > 0) {
					sortedOpportunities.push(opportunity);
				}
			});
			sortedOpportunities.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
			User.find((err, users) => {
				if (err) {
					console.log(err);
					return;
				}
				if (currentAcc.account_type == 1) {
					Org.findOne({ '_id': currentAcc.account_id }, (err, org) => {
						if (err) {
							console.log(err);
						}
						// console.log(org);
						const followers = users.filter(user => org.followers.indexOf(user.username) >= 0);
						res.render('opportunities/dashboard', {
							title: 'ChanceMap | Opportunities',
							opportunities: sortedOpportunities,
							criteriaList: criteriaList,
							account_type: currentAcc.account_type,
							account_id: currentAcc.account_id,
							currentAcc: org,
							notis: req.notis,
							users: users,
							messages: messages,
							connected: followers
						});
					});
				} else {
					User.findOne({ '_id': currentAcc.account_id }, (err, user) => {
						if (err) {
							console.log(err);
						}
						// console.log(user);
						const connected = users.filter(client => user.connected.indexOf(client.username) >= 0);
						res.render('opportunities/dashboard', {
							title: 'ChanceMap | Opportunities',
							opportunities: sortedOpportunities,
							criteriaList: criteriaList,
							account_type: currentAcc.account_type,
							account_id: currentAcc.account_id,
							currentAcc: user,
							notis: req.notis,
							users: users,
							messages: messages,
							connected: connected
						});
					});
				}
			});
		});
	});
});

// @Routes /search/
router.get('/', (req, res) => {
	// console.log(req.query.criteriaList);
	let criteriaList = req.query.criteriaList;
	let currentAcc = req.user;
	// console.log(currentAcc);
	Message.find((err, messages) => {
		Event.find((err, events) => {
			if (err) {
				console.log(err);
				return;
			}
			// console.log("Events: " + events.length);
			var sortedEvents = [];
			events.forEach(event => {
				event.matches = 0;
				criteriaList.forEach(criteria => {
					if (event.org_name.toLowerCase().includes(criteria) || event.name.toLowerCase().includes(criteria)) {
						event.matches++;
					}
					event.hashtags.forEach(hashtag => {
						if (hashtag.includes(criteria)) {
							event.matches++;
						}
					});
				});
				if (event.matches > 0) {
					sortedEvents.push(event);
				}
			});
			sortedEvents.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
			Job.find((err, jobs) => {
				if (err) {
					console.log(err);
					return;
				}
				// console.log("Jobs: " + jobs.length);
				var sortedJobs = [];
				jobs.forEach(job => {
					job.matches = 0;
					criteriaList.forEach(criteria => {
						if (job.org_name.toLowerCase().includes(criteria) || job.name.toLowerCase().includes(criteria)) {
							job.matches++;
						}
						job.hashtags.forEach(hashtag => {
							if (hashtag.includes(criteria)) {
								job.matches++;
							}
						});
					});
					if (job.matches > 0) {
						sortedJobs.push(job);
					}
				});
				sortedJobs.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
				Org.find((err, orgs) => {
					if (err) {
						console.log(err);
						return;
					}
					// console.log("Orgs: " + orgs.length);
					var sortedOrgs = [];
					orgs.forEach(org => {
						org.matches = 0;
						criteriaList.forEach(criteria => {
							if (org.username.toLowerCase().includes(criteria) || org.name.toLowerCase().includes(criteria)) {
								org.matches++;
							}
							org.hashtags.forEach(hashtag => {
								if (hashtag.includes(criteria)) {
									org.matches++;
								}
							});
						});
						if (org.matches > 0) {
							sortedOrgs.push(org);
						}
					});
					sortedOrgs.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
					User.find((err, users) => {
						if (err) {
							console.log(err);
							return;
						}
						// console.log("Users: " + users.length);
						const sortedUsers = [];
						users.forEach(user => {
							if (user.username !== undefined && user.name !== undefined) {
								user.matches = 0;
								const hashtags = user.interests.concat(user.skills);
								criteriaList.forEach(criteria => {
									if (user.username.toLowerCase().includes(criteria) || user.name.toLowerCase().includes(criteria)) {
										user.matches++;
									}

									hashtags.forEach(hashtag => {
										if (hashtag.includes(criteria)) {
											user.matches++;
										}
									});
								});
								if (user.matches > 0) {
									sortedUsers.push(user);
								}
							}
						});
						sortedUsers.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
						Opportunity.find((err, opportunities) => {
							if (err) {
								console.log(err);
								return;
							}
							console.log("Opportunities: " + opportunities.length);
							var sortedOpportunities = [];
							opportunities.forEach(opportunity => {
								opportunity.matches = 0;
								criteriaList.forEach(criteria => {
									if (opportunity.org_name.toLowerCase().includes(criteria) || opportunity.name.toLowerCase().includes(criteria)) {
										opportunity.matches++;
									}
									opportunity.hashtags.forEach(hashtag => {
										if (hashtag.includes(criteria)) {
											opportunity.matches++;
										}
									});
								});
								if (opportunity.matches > 0) {
									sortedOpportunities.push(opportunity);
								}
							});
							sortedOpportunities.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
							if (currentAcc.account_type == 1) {
								Org.findOne({ '_id': currentAcc.account_id }, (err, org) => {
									if (err) {
										console.log(err);
									}
									const followers = users.filter(user => org.followers.indexOf(user.username) >= 0);
									res.render('index', {
										title: 'ChanceMap | Home',
										events: sortedEvents,
										jobs: sortedJobs,
										orgs: sortedOrgs,
										users: sortedUsers,
										opportunities: sortedOpportunities,
										criteriaList: criteriaList,
										account_type: currentAcc.account_type,
										account_id: currentAcc.account_id,
										currentAcc: org,
										notis: req.notis,
										messages: messages,
										connected: followers
									});
								});
							} else {
								User.findOne({ '_id': currentAcc.account_id }, (err, user) => {
									if (err) {
										console.log(err);
									}
									const connected = users.filter(client => user.connected.indexOf(client.username) >= 0);
									res.render('index', {
										title: 'ChanceMap | Home',
										events: sortedEvents,
										jobs: sortedJobs,
										orgs: sortedOrgs,
										users: sortedUsers,
										opportunities: sortedOpportunities,
										criteriaList: criteriaList,
										account_type: currentAcc.account_type,
										account_id: currentAcc.account_id,
										currentAcc: user,
										notis: req.notis,
										messages: messages,
										connected: connected
									});
								});
							}
						});
					});
				});
			});
		});
	});
});

router.post('/preview-tags', (req, res) => {
	let wordsInput = req.body.wordsInput;
	User.find({
		$or: [
			{
				interests: {
					$regex: new RegExp(wordsInput)
				}
			},
			{
				skills: {
					$regex: new RegExp(wordsInput)
				}
			}
		]
	}, function (err, data) {
		var searchArray = [];
		data.forEach(entry => {
			searchArray = searchArray.concat(entry.interests);
			searchArray = searchArray.concat(entry.skills);
		});
		Org.find({
			hashtags: {
				$regex: new RegExp(wordsInput)
			}
		}, (err, org_data) => {
			org_data.forEach(org_entry => {
				searchArray = searchArray.concat(org_entry.hashtags);
			});
			searchArray = searchArray.filter(onlyUnique);
			res.json(searchArray);
		}).limit(10);
	}).limit(10);
});

function onlyUnique(value, index, self) {
	return self.indexOf(value) === index;
}

// usage example:

/*function sort_unique(arr) {
  if (arr.length === 0) return arr;
  arr = arr.sort(function (a, b) { return a*1 - b*1; });
  var ret = [arr[0]];
  for (var i = 1; i < arr.length; i++) { //Start loop at 1: arr[0] can never be a duplicate
    if (arr[i-1] !== arr[i]) {
      ret.push(arr[i]);
    }
  }
  return ret;
}*/

// Exports
module.exports = router;
