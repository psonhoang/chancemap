const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const nodemailer = require('nodemailer');
const config = require('../config/database.js');
const async = require('async');

// For file uploading
const crypto = require('crypto');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');

// Models
const Account = require('../models/account');
const User = require('../models/user');
const Org = require('../models/org');
const Event = require('../models/event');
const Job = require('../models/job');
const Opportunity = require('../models/opportunity');
const OrgProfile = require('../models/orgProfile');
const Notification = require('../models/notification');

//Collectinns
const avaOrgDefault = 'https://cdn0.iconfinder.com/data/icons/users-android-l-lollipop-icon-pack/24/group2-512.png';
const avaUserDefault = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Antu_im-invisible-user.svg/2000px-Antu_im-invisible-user.svg.png';

// Utils
const utils = require('../utils');

// Database connection
const conn = mongoose.connection;

// Init gfs
let gfs;

conn.once('open', () => {
	// Init stream
	gfs = Grid(conn.db, mongoose.mongo);
	gfs.collection('uploads');
	console.log('connected to uploads database!');
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

// ***** ROUTES *****
// Login
router.get('/login', (req, res) => {
	res.render('login', { title: "ChanceMap | Login", message: req.flash('error') });
});

router.post('/login', passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }), (req, res, next) => {
	// issue a remember me cookie if the option was checked
	if (!req.body.remember_me) { return next(); }
	var token = utils.generateToken(64);
	Token.save(token, { userId: req.user.id }, function (err) {
		if (err) { return done(err); }
		res.cookie('remember_me', token, { path: '/', httpOnly: true, maxAge: 604800000 }); // 7 days
		return next();
	});
}, (req, res) => {
	res.redirect('/');
});

// logout
router.get('/logout', (req, res) => {
	req.logout();
	res.redirect('/login');
});

// Register
router.get('/register', (req, res) => {
	res.render('register', { title: "ChanceMap | Sign up", message: "" });
});

// @route POST
// @desc Determine which register view to render (regOrg || regUser)
router.post('/register', (req, res) => {
	let data = req.body;
	if (!(data.org_acc || data.user_acc) || data.password != data.re_password) {
		res.render('register', { title: "ChanceMap | Sign up", message: "Your passwords don't match!" });
	} else {
		Account.findOne({ username: data.username }, (err, account) => {
			if (err) {
				console.log(err);
				return;
			}
			if (!account) {
				Account.findOne({ email: data.email }, (err, acc) => {
					if (err) {
						console.log(err);
						return;
					}
					if (!acc) {
						let acc_type = 0;
						if (data.org_acc) { acc_type = 1; }
						if (acc_type == 0) {
							res.render('regUser', {
								title: 'ChanceMap | Sign Up',
								user: data // username, email, password
							});
						} else {
							res.render('regOrg', {
								title: 'ChanceMap | Sign Up',
								org: data
							});
						}
					} else {
						res.render('register', { title: "ChanceMap | Sign up", message: data.email + " already exists!" });
					}
				});
			} else {
				res.render('register', { title: "ChanceMap | Sign up", message: data.username + " already exists!" });
			}
		});
	}
});

// @route POST
// @desc Register new user account
router.post('/register/user', upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'resume_file', maxCount: 1 }]), (req, res) => {

	let data = req.body;

	let name = data.name;
	let username = data.username.trim();
	let email = data.email;
	let password = data.password;
	let interests = data.interests;
	let skills = data.skills;
	let resume_file = data.resume_file;

	if (req.files['resume_file']) {
		resume_file = '/files/' + req.files['resume_file'][0].filename;
	}

	let school = data.school;
	let intro = data.intro;
	let facebook = data.facebook;
	let website = data.website;
	let avatar = avaUserDefault;

	if (req.files['avatar']) {
		avatar = '/files/' + req.files['avatar'][0].filename;
	}

	Account.findOne({ email: email }, (err, acc) => {
		if (err) {
			console.log(err);
			return;
		}
		if (!acc) {
			var newUser = new User({
				_id: new mongoose.Types.ObjectId(),
				created_at: new Date(),
				updated_at: new Date(),
				name: name,
				email: email,
				username: username,
				interests: interests,
				skills: skills,
				intro: intro,
				school: school,
				resume_file: resume_file, // stores resume file's link (optional)
				jobs: [],
				facebook: facebook,
				website: website,
				following: [], // contain org_ids
				avatar: avatar,
				new_notis: []
			});

			newUser.save((err, user) => {
				if (err) {
					console.log(err);
					return;
				}
				console.log("New User account made!");
			});

			var newAccount = new Account({
				_id: new mongoose.Types.ObjectId(),
				created_at: new Date(),
				updated_at: new Date(),
				email: email,
				username: username,
				password: password,
				account_type: 0, // 0: User account; 1: Org account
				account_id: newUser._id // store either user or org account's _id
			});

			bcrypt.genSalt(10, function (err, salt) {
				bcrypt.hash(newAccount.password, salt, function (err, hash) {
					if (err) {
						console.log(err);
					}
					newAccount.password = hash;
					newAccount.save((err, acc) => {
						if (err) {
							console.log(err);
							return;
						}
						console.log(acc);
						res.redirect('/login');
					});
				});
			});

		} else {
			res.render('register', { title: "ChanceMap | Sign up", message: email + " already exists!" });
		}
	});
});

// @route POST
// @desc Register new org account
router.post('/register/org', upload.single('avatar'), (req, res) => {

	console.log("POST on /register/org");

	let data = req.body;

	let name = data.name;
	let username = data.username.trim();
	let email = data.email;
	let password = data.password;
	let hashtags = data.hashtags;
	let desc = data.desc;
	let facebook = data.facebook;
	let website = data.website;
	let avatar = avaOrgDefault;

	if (req.file) {
		avatar = '/files/' + req.file.filename;
	}

	Account.findOne({ email: email }, (err, acc) => {
		if (err) {
			console.log(err);
			return;
		}
		if (!acc) {
			var newOrg = new Org({
				_id: new mongoose.Types.ObjectId(),
				created_at: new Date(),
				updated_at: new Date(),
				name: name,
				email: email,
				username: username,
				hashtags: hashtags,
				events: [], // contain events' _ids
				jobs: [], // contain jobs' _ids
				followers: [], // contain users' _ids
				desc: desc,
				facebook: facebook,
				website: website,
				avatar: avatar,
				new_notis: []
			});

			newOrg.save((err, acc) => {
				if (err) {
					console.log(err);
					return;
				}
				console.log("New Org Account Made!");
			});

			var newProfile = new OrgProfile({
				_id: new mongoose.Types.ObjectId(),
				created_at: new Date(),
				updated_at: new Date(),
				org_id: newOrg._id,
				org_name: newOrg.name,
				what_we_do: "", //contain description of org
				our_team: "", //contain description of org's team
				carousel: []
			});

			newProfile.save((err, profile) => {
				if (err) {
					console.log(err);
					return;
				}
				console.log("New Org Profile Made!");
			});

			var newAccount = new Account({
				_id: new mongoose.Types.ObjectId(),
				created_at: new Date(),
				updated_at: new Date(),
				email: email,
				username: username,
				password: password,
				account_type: 1, // 0: User account; 1: Org account
				account_id: newOrg._id // store either user or org account's _id
			});

			bcrypt.genSalt(10, function (err, salt) {
				bcrypt.hash(newAccount.password, salt, function (err, hash) {
					if (err) {
						console.log(err);
					}
					newAccount.password = hash;
					newAccount.save((err, acc) => {
						if (err) {
							console.log(err);
							return;
						}
						console.log(acc);
						res.redirect('/login');
					});
				});
			});
		} else {
			res.render('register', { title: "ChanceMap | Sign up", message: email + " already exists!" });
		}
	});

});

// View account profile
router.get('/profile', async (req, res) => {

	let currentAcc = req.user;
	let account_type = currentAcc.account_type;
	let account_id = currentAcc.account_id;

	Org.find().then(async orgs => {
		var users = await User.find();
		var events = await Event.find();
		var jobs = await Job.find();
		var opportunities = await Opportunity.find();

		if (account_type == 0) {
			const currentUser = await User.findOne({ '_id': currentAcc.account_id });

			let criteriaList = currentUser.interests.concat(currentUser.skills);
			let following = orgs.filter(org => currentUser.following.indexOf(org.username) >= 0);
			let connected = users.filter(user => currentUser.connected.indexOf(user.username) >= 0);
			events = events.filter(event => currentUser.events.indexOf(event._id) >= 0);
			jobs = jobs.filter(job => currentUser.jobs.indexOf(job._id) >= 0);
			opportunities = opportunities.filter(opp => currentUser.opps.indexOf(opp._id) >= 0);

			res.render('users/myProfile', {
				title: 'ChanceMap | Following',
				orgs: following,
				users: users,
				events: events,
				jobs: jobs,
				opportunities: opportunities,
				account_type: account_type,
				account_id: account_id,
				currentAcc: currentUser,
				notis: req.notis,
				criteriaList: criteriaList,
				connected: connected,
			});

		} else {
			const org = await Org.findOne({ '_id': currentAcc.account_id });
			const profile = await OrgProfile.findOne({ 'org_id': org._id });

			let followers = users.filter(user => org.followers.indexOf(user.username) >= 0);
			let criteriaList = org.hashtags;
			jobs = jobs.filter(job => org.jobs.indexOf(job._id) >= 0);
			events = events.filter(event => org.events.indexOf(event._id) >= 0);

			res.render('orgs/edit', {
				title: 'ChanceMap | My Profile',
				account_type: currentAcc.account_type,
				account_id: currentAcc.account_id,
				currentAcc: org,
				profile: profile,
				users: users,
				jobs: jobs,
				events: events,
				connected: followers,
				notis: req.notis,
				criteriaList: criteriaList
			});
		}
	});
});

// @route POST
// @desc save edits to current user account's profile
router.post('/profile/user', upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'resume_file', maxCount: 1 }]), (req, res) => {
	let data = req.body;
	let currentAcc = req.user;

	User.findOne({ '_id': currentAcc.account_id }, (err, user) => {
		if (err) {
			res.send('Database error...');
			console.log(err);
			return;
		}
		console.log(user.avatar);
		if (req.files['avatar']) {
			if (user.avatar != avaUserDefault) {
				gfs.remove({ filename: user.avatar.split('files/')[1], root: 'uploads' }, (err, result) => {
					if (err) {
						console.log(err);
					} else {
						console.log(result);
					}
				});
			}
			// delete existing avatar file
			user.avatar = '/files/' + req.files['avatar'][0].filename;
		}
		user.name = data.name;
		user.email = data.email;
		user.interests = data.interests;
		user.skills = data.skills;
		if (req.files['resume_file']) {
			if (user.resume_file) {
				// delete existing resume file
				gfs.remove({ filename: user.resume_file.split('files/')[1], root: 'uploads' }, (err, result) => {
					if (err) {
						console.log(err);
						return;
					} else {
						console.log(result);
					}
				});
			}
			user.resume_file = '/files/' + req.files['resume_file'][0].filename;
		}
		user.school = data.school;
		user.intro = data.intro;
		user.facebook = data.facebook;
		user.website = data.website;
		if (!user.created_at) {
			user.created_at = new Date();
		}
		user.updated_at = new Date();

		user.save().then(result => {
			console.log(result);
			res.redirect('/profile');
		}).catch(err => {
			res.send(err);
		});
	});
});

// @desc save edits to current org account's profile
router.post('/profile/org', upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'carousel1', maxCount: 1 }, { name: 'carousel2', maxCount: 1 }, { name: 'carousel3', maxCount: 1 }]), (req, res) => {

	let data = req.body;
	let currentAcc = req.user;

	console.log('POST on /profile/org');

	Org.findOne({ 'username': currentAcc.username }, (err, org) => {

		if (err) {
			console.log(err);
			return;
		}

		//change avatar
		if (req.files['avatar']) {
			if (org.avatar != avaOrgDefault) {
				// delete existing avatar file
				gfs.remove({ filename: org.avatar.split('files/')[1], root: 'uploads' })
					.then(console.log("Avatar changed!"))
					.catch(err => res.send(err));
			}
			org.avatar = '/files/' + req.files['avatar'][0].filename;
		}

		//update org information
		org.name = data.name;
		org.email = data.email;
		org.hashtags = data.hashtags;
		org.desc = data.desc;
		org.facebook = data.facebook;
		org.website = data.website;
		if (!org.created_at) {
			org.created_at = new Date();
		}
		org.updated_at = new Date();

		org.save().then(result => {
			console.log("Org save success!");
			OrgProfile.findOne({ 'org_id': org._id }).then(profile => {
				if (err) {
					console.log(err);
					return;
				}
				if (profile != null) {

					//update profile text
					profile.what_we_do = data.what_we_do;
					profile.our_team = data.our_team;
					profile.past_work = data.past_work;

					//update carousel
					for (i = 0; i < 3; i++) {
						if (req.files['carousel' + (i + 1).toString()]) {
							if (profile.carousel[i] != null) {
								// delete existing carousel file
								gfs.remove({ filename: profile.carousel[i].split('files/')[1], root: 'uploads' })
									.then(console.log("Carousel " + (i + 1) + " changed"))
									.catch(err);
							}
							profile.carousel.splice(i, 1, '/files/' + req.files['carousel' + (i + 1).toString()][0].filename);
						}
					}

					//save
					profile.updated_at = new Date();
					profile.save((err, profile) => {
						console.log("profile  save success!");
						res.redirect("/orgs/" + org.username);
					});
				} else {

					//add new carousels
					var carousels = [];
					for (i = 0; i < 3; i++) {
						if (req.files['carousel' + (i + 1).toString()]) {
							carousels[i] = '/files/' + req.files['carousel' + (i + 1).toString()][0].filename;
						}
					}

					//make new profile
					var newProfile = new OrgProfile({
						_id: new mongoose.Types.ObjectId(),
						created_at: new Date(),
						updated_at: new Date(),
						org_id: org._id,
						org_name: org.name,
						what_we_do: data.what_we_do, //contain description of org
						our_team: data.our_team, //contain description of org's team
						past_work: data.past_work,
						carousel: carousels
					});

					newProfile.save((err, profile) => {
						if (err) {
							console.log(err);
							return;
						}
						console.log("Profile save success!");
						res.redirect("/orgs/" + org.username);
					});
				}
			}).catch(err => res.send(err));
		}).catch(err => {
			res.send(err);
		});
	});
});

// users connecting function
router.post('/connect', upload.single(), (req, res) => {
	let user_id = req.body.user_id;
	let account_id = req.body.account_id;
	let status = req.body.status;
	console.log(req.body);

	if (status === 'connect_request') {
		User.findOne({ '_id': account_id }, (err, currentAcc) => {
			User.findOne({ '_id': user_id }, (err, user) => {
				console.log(`Sender: ${currentAcc}`);
				console.log(`Recipient: ${user}`);
				if (currentAcc.connect_sent.indexOf(user.username) < 0) {
					//update sender
					currentAcc.connect_sent.push(user.username);
					currentAcc.updated_at = new Date();
					currentAcc.save().then(result => {
						console.log(currentAcc.connect_sent);

						//update recipient
						user.connect_received.push(currentAcc.username);
						user.updated_at = new Date();
						user.save().then(result => {
							console.log(user.connect_received);
							console.log("Connect request sent!");
							res.end();
						}).catch(err => {
							res.send(err);
						});
					});
				}
			});
		});
	} else if (status === 'connect_accept') {
		User.findOne({ '_id': account_id }, (err, currentAcc) => {
			User.findOne({ '_id': user_id }, (err, user) => {
				console.log(`Sender: ${currentAcc.name}`);
				console.log(`Recipient: ${user.name}`);

				if (currentAcc.connected.indexOf(user.username) < 0 && currentAcc.connect_received.indexOf(user.username) >= 0) {
					//update sender
					let i = currentAcc.connect_received.indexOf(user.username);
					currentAcc.connect_received.splice(i, 1);
					currentAcc.connected.push(user.username);
					currentAcc.updated_at = new Date();
					currentAcc.save().then(result => {
						console.log(currentAcc.connected);

						//update recipient
						let i = user.connect_sent.indexOf(currentAcc.username);
						user.connect_sent.splice(i, 1);
						user.connected.push(currentAcc.username);
						user.updated_at = new Date();
						user.save().then(result => {
							console.log(user.connected);
							console.log("Successfully connected!");
							res.end();
						}).catch(err => {
							res.send(err);
						});
					});
				}
			});
		});
	} else if (status === 'disconnect') {
		User.findOne({ '_id': account_id }, (err, currentAcc) => {
			User.findOne({ '_id': user_id }, (err, user) => {

				if (currentAcc.connected.indexOf(user.username) >= 0) {
					//update sender
					let i = currentAcc.connected.indexOf(user.username);
					currentAcc.connected.splice(i, 1);
					currentAcc.updated_at = new Date();
					currentAcc.save().then(result => {
						console.log("Successfully disconnected");

						//update recipient
						let i = user.connected.indexOf(currentAcc.username);
						user.connected.splice(i, 1);
						user.updated_at = new Date();
						user.save().then(result => {
							res.end();
						}).catch(err => {
							res.send(err);
						});
					});
				}
			}).catch(err => {
				res.send(err);
			});
		});
	}
});

// add events/jobs/opportunities function
router.post('/add_items', upload.single(), (req, res) => {
	let account_id = req.body.account_id;
	let status = req.body.status;
	console.log(status);

	User.findOne({ '_id': account_id }, (err, user) => {
		if (status === 'add_event' && user.events.indexOf(req.body.event_id) < 0) {
			let event_id = req.body.event_id;
			user.events.push(event_id);
			user.updated_at = new Date();
			user.save().then(result => {
				console.log(user.events);
			})
		} else if (status === 'add_job' && user.jobs.indexOf(req.body.job_id) < 0) {
			let job_id = req.body.job_id;
			user.jobs.push(job_id);
			user.updated_at = new Date();
			user.save().then(result => {
				console.log(user.jobs);
			})
		} else if (status === 'add_opp' && user.opps.indexOf(req.body.opp_id) < 0) {
			let opp_id = req.body.opp_id;
			user.opps.push(opp_id);
			user.updated_at = new Date();
			user.save().then(result => {
				console.log(user.opps);
			})
		}
	})
});

// remove events/jobs/opportunities function
router.post('/remove_items', upload.single(), (req, res) => {
	let account_id = req.body.account_id;
	let status = req.body.status;
	console.log(status);
	console.log(account_id);

	User.findOne({ '_id': account_id }, (err, user) => {
		// console.log(user);
		if (status === 'remove_event' && user.events.indexOf(req.body.event_id) >= 0) {
			let event_id = req.body.event_id;
			let i = user.events.indexOf(event_id);
			user.events.splice(i, 1);
			user.updated_at = new Date();
			user.save().then(result => {
				console.log('Event removed')
				console.log(user.events);
			});
		} else if (status === 'remove_job' && user.jobs.indexOf(req.body.job_id) >= 0) {
			let job_id = req.body.job_id;
			let i = user.jobs.indexOf(job_id);
			user.jobs.splice(i, 1);
			user.updated_at = new Date();
			user.save().then(result => {
				console.log('Job removed')
				console.log(user.jobs);
			});
		} else if (status === 'remove_opp' && user.opps.indexOf(req.body.opp_id) >= 0) {
			let opp_id = req.body.opp_id;
			console.log(opp_id);
			console.log(user.opps);
			let i = user.opps.indexOf(opp_id);
			console.log(i);
			user.opps.splice(i, 1);
			user.updated_at = new Date();
			user.save().then(result => {
				console.log('Opportunity removed')
				console.log(user.opps);
			});
		}
	});
});

//@route POST
//@desc Follower/Following func
router.post('/follow', upload.single(), (req, res) => {
	let org_id = req.body.org_id;
	let user_id = req.body.user_id;
	let follow = req.body.follow;

	console.log(req.body);
	if (follow == "true") {
		User.findOne({ '_id': user_id }, (err, user) => {
			if (err) {
				res.send("Database error!");
				console.log(err);
				return;
			}
			Org.findOne({ '_id': org_id }, (err, org) => {
				if (err) {
					res.send('Database error!');
					console.log(err);
					return;
				}
				if (user.following.indexOf(org.username) < 0) {
					user.following.push(org.username);
					user.updated_at = new Date();
					user.save().then(result => {
						console.log("Successfully follow!");
						org.followers.push(user.username);
						org.updated_at = new Date();
						org.save().then(result => {
							console.log("Successfully Add follower!");
							res.end();
						}).catch(err => {
							res.send(err);
						});
					});
				}
				else {
					res.send("Unexpected Error!")
				}
			}).catch(err => {
				res.send(err);
			});
		});
	}
	else if (follow == "false") {
		User.findOne({ '_id': user_id }, (err, user) => {
			if (err) {
				res.send("Database error!");
				console.log(err);
				return;
			}
			Org.findOne({ '_id': org_id }, (err, org) => {
				if (err) {
					res.send('Database error!');
					console.log(err);
					return;
				}
				if (user.following.indexOf(org.username) > -1) {
					let i = user.following.indexOf(org.username);
					user.following.splice(i, 1);
					user.updated_at = new Date();
					user.save().then(result => {
						console.log("Successfully unfollow");
						let i = org.followers.indexOf(user.username);
						org.followers.splice(i, 1);
						org.updated_at = new Date();
						org.save().then(result => {
							console.log("Successfully remove follower!");
							res.end();
						}).catch(err => {
							res.send(err);
						});
					});
				}
			}).catch(err => {
				res.send(err);
			});
		});
	}
});

// Notifications
router.get('/notifications', (req, res) => {
	if (req.isAuthenticated()) {
		User.find((err, users) => {
			Notification.find({ 'accounts': req.user.username }, (err, notis) => {
				if (err) {
					console.log(err);
					return;
				}
				if (req.user.account_type == 0) {
					User.findOne({ 'username': req.user.username }, (err, user) => {
						let connected = users.filter(client => user.connected.indexOf(client.username) >= 0);
						res.render('notification', {
							title: 'ChanceMap | Notifications',
							currentAcc: user,
							account_type: req.user.account_type,
							account_id: req.user.account_id,
							notis: notis,
							connected: connected,
							users: users,
						});
					});
				} else {
					Org.findOne({ 'username': req.user.username }, (err, org) => {
						let followers = users.filter(user => org.followers.indexOf(user.username) >= 0);
						res.render('notification', {
							title: 'ChanceMap | Notifications',
							currentAcc: org,
							account_type: req.user.account_type,
							account_id: req.user.account_id,
							notis: notis,
							connected: followers,
							users: users,
						});
					});
				}
			});
		});
	} else {
		res.redirect('/login');
	}
});

router.get('/clear-notifications', (req, res) => {
	if (req.isAuthenticated()) {
		let account_id = req.query.account_id;
		let account_type = req.query.account_type;
		console.log(typeof (account_type));
		console.log(account_type);
		if (account_type == '0') {
			console.log('user');
			User.findOne({ '_id': account_id }, (err, user) => {
				user.new_notis = [];
				user.save().then(result => {
					res.send(result);
				}).catch(err => {
					res.send(err);
				});
			});
		} else {
			console.log('org');
			Org.findOne({ '_id': account_id }, (err, org) => {
				org.new_notis = [];
				org.save().then(result => {
					res.send(result);
				}).catch(err => {
					res.send(err);
				});
			});
		}
	} else {
		res.redirect('/login');
	}
});

// Forgot Password
router.get('/recover-password', function (req, res) {
	res.render('recover-password', { title: "ChanceMap | Recover Password", message: req.flash('error') });
});

router.post('/recover-password', function (req, res, next) {
	async.waterfall([
		function (done) {
			crypto.randomBytes(20, function (err, buf) {
				var token = buf.toString('hex');
				done(err, token);
			});
		},
		function (token, done) {
			Account.findOne({ email: req.body.email }, function (err, user) {
				if (!user) {
					req.flash('danger', 'No account with that email exists.');
					return res.redirect('/recover-password');
				}

				user.resetPassToken = token;
				user.resetExpiration = Date.now() + 300000; //5 mins

				user.save(function (err) {
					done(err, token, user);
				});
			});
		},
		function (token, user, done) {
			console.log('http://' + req.headers.host + '/reset/' + token + '\n\n');
			// var smtpTransport = nodemailer.createTransport({
			// 	service: 'Gmail',
			// 	auth: {
			// 		user: 'chancemap.official@gmail.com',
			// 		pass: 'Chancemap1234'
			// 	}
			// });
			// var mailOptions = {
			// 	to: user.email,
			// 	from: 'chancemap.official@gmail.com',
			// 	subject: 'ChanceMap Account - Password Reset',
			// 	text: 'Click on this link to reset your password: http://' + req.headers.host + '/reset/' + token + '\n\n'
			// };
			// smtpTransport.sendMail(mailOptions, function (err) {
			// 	console.log('mail sent');
			// 	req.flash('success', 'An email request has been sent to' + user.email);
			// 	done(err, 'done');
			// });
		}
	], function (err) {
		if (err) return next(err);
		res.redirect('/login');
	});
});

router.get('/reset/:token', function (req, res) {
	Account.findOne({ resetPassToken: req.params.token, resetExpiration: { $gt: Date.now() } }, function (err, user) {
		if (!user) {
			req.flash('danger', 'Password reset token is invalid or has expired');
			return res.redirect('/recover-password');
		}
		res.render('reset', { token: req.params.token, title: "ChanceMap | RESET PASSWORD", message: req.flash('error') });
	});
});

router.post('/reset/:token', function (req, res) {
	async.waterfall([
		function (done) {
			Account.findOne({ resetPassToken: req.params.token, resetExpiration: { $gt: Date.now() } }, function (err, user) {
				if (!user) {
					req.flash('danger', 'Password reset token is invalid or has expired');
					return res.redirect('/recover-password');
				}
				if (req.body.password === req.body.confirm) {
					bcrypt.genSalt(10, function (err, salt) {
						bcrypt.hash(req.body.password, salt, function (err, hash) {
							if (err) {
								console.log(err);
							}
							user.password = hash;
							user.save(function (err) {
								if (err) {
									console.log(err);
									return;
								} else {
									req.flash('success', 'Your password has changed');
									res.redirect('/login');
									done(err, user);
								}
							});
						});
						user.resetPassToken = undefined;
						user.resetExpiration = undefined;
					});
				} else {
					req.flash('danger', 'Passwords do not match');
					return res.redirect('/recover-password');
				}
			});
		},
		function (user, done) {
			// var smtpTransport = nodemailer.createTransport({
			// 	service: 'Gmail',
			// 	auth: {
			// 		user: 'chancemap.official@gmail.com',
			// 		pass: 'Chancemap@1234'
			// 	}
			// });
			// var mailOptions = {
			// 	to: user.email,
			// 	from: 'chancemap.official@gmail.com',
			// 	subject: 'ChanceMap Account - Password Reset',
			// 	text: 'Your account password has been successfully reset'
			// };
			// smtpTransport.sendMail(mailOptions, function (err) {
			// 	req.flash('success', 'Password changed!');
			// 	done(err);
			// });
			console.log('New password!');
		}
	], function (err) {
		res.redirect('/');
	});
});


// Exports
module.exports = router;
