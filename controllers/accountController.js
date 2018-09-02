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
const Notification = require('../models/notification');

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
	res.render('login', {title: "ChanceMap | Login", message: req.flash('error')});
});

router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true,
  })(req, res, next);
});

// logout
router.get('/logout', (req, res) => {
	req.logout();
	res.redirect('/login');
});

// Register
router.get('/register', (req, res) => {
	res.render('register', {title: "ChanceMap | Sign up", message: ""});
});

// @route POST
// @desc Determine which register view to render (regOrg || regUser)
router.post('/register', (req, res) => {
	let data = req.body;
	if(!(data.org_acc || data.user_acc) || data.password != data.re_password) {
		res.render('register', {title: "ChanceMap | Sign up", message: "Your passwords don't match!"});
	} else {
		let acc_type = 0;
		if(data.org_acc) { acc_type = 1; }
		if(acc_type == 0) {
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
	}
});

// @route POST
// @desc Register new user account
router.post('/register/user', upload.fields([{name: 'avatar', maxCount: 1}, {name: 'resume_file', maxCount: 1}]), (req, res) => {
	// console.log(req.body);
	// console.log(req.files);

	console.log('POST on /register/user');

	let data = req.body;
	let name = data.name;
	let username = data.username.trim();
	let email = data.email;
	let password = data.password;
	let interests = data.interests;
	let skills = data.skills;
	let resume_file = data.resume_file;
	if(req.files['resume_file']) {
		resume_file = '/files/' + req.files['resume_file'][0].filename;
	}
	console.log(resume_file);
	let school = data.school;
	let intro = data.intro;
	let facebook = data.facebook;
	let website = data.website;
	let avatar = "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Antu_im-invisible-user.svg/2000px-Antu_im-invisible-user.svg.png";
	if(req.files['avatar']) {
		avatar = '/files/' + req.files['avatar'][0].filename;
	}

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
    if(err) {
      console.log(err);
      return;
    }
    console.log(user);
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

	bcrypt.genSalt(10, function(err, salt) {
    bcrypt.hash(newAccount.password, salt, function(err, hash) {
      if(err) {
        console.log(err);
      }
      newAccount.password = hash;
      newAccount.save((err, acc) => {
        if(err) {
          console.log(err);
          return;
        }
        console.log(acc);
        res.redirect('/login');
      });
    });
  });
});

// @route POST
// @desc Register new org account
router.post('/register/org', upload.single('avatar'), (req, res) => {
	// console.log(req.body);
	// console.log(req.file);

	let data = req.body;
	let name = data.name;
	let username = data.username.trim();
	let email = data.email;
	let password = data.password;
	let hashtags = data.hashtags;
	console.log(hashtags);
	let desc = data.desc;
	console.log(desc);
	let facebook = data.facebook;
	let website = data.website;
	let avatar = "https://cdn0.iconfinder.com/data/icons/users-android-l-lollipop-icon-pack/24/group2-512.png";
	if(req.file) {
		avatar = '/files/' + req.file.filename;
	}

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
    if(err) {
      console.log(err);
      return;
    }
    console.log(acc);
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

	bcrypt.genSalt(10, function(err, salt) {
    bcrypt.hash(newAccount.password, salt, function(err, hash) {
      if(err) {
        console.log(err);
      }
      newAccount.password = hash;
      newAccount.save((err, acc) => {
        if(err) {
          console.log(err);
          return;
        }
        console.log(acc);
        res.redirect('/login');
      });
    });
  });
});


// @route GET
// @desc edit current account's profile
router.get('/profile', (req, res) => {
	if(!req.isAuthenticated()) {
    res.redirect('/login');
  } else {
    let account_type = req.user.account_type;
    let account_id = req.user.account_id;
    Notification.find({'accounts': req.user.username}, (err, notis) => {
    	if(err) {
    		console.log(err);
    		return;
    	}
    	if(account_type == 0) {
	      User.findOne({'_id': account_id}, (err, user) => {
	        res.render('profile', {
	          title: 'ChanceMap | My Profile',
	          account_type: account_type,
	          account_id: account_id,
	          currentAcc: user,
	          notis: req.notis
	        });
	      });
	    } else {
	      Org.findOne({'_id': account_id}, (err, org) => {
	          res.render('profile', {
	            title: 'ChanceMap | My Profile',
	            account_type: account_type,
	            account_id: account_id,
	            currentAcc: org,
	            notis: req.notis
	          });
	      });
	    }
    });
  }
});

// @route POST
// @desc save edits to current user account's profile
router.post('/profile/user', upload.fields([{name: 'avatar', maxCount: 1}, {name: 'resume_file', maxCount: 1}]), (req, res) => {
	let data = req.body;
	const currentAcc = req.user;

	console.log('POST on /profile/user');

	User.findOne({'username': currentAcc.username}, (err, user) => {
		if(err) {
			res.send('Database error...');
			console.log(err);
			return;
		}
		console.log(user.avatar);
		if(req.files['avatar']) {
			if(user.avatar != 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Antu_im-invisible-user.svg/2000px-Antu_im-invisible-user.svg.png') {
				gfs.remove({filename: user.avatar.split('files/')[1], root: 'uploads'}, (err, result) => {
					if(err) {
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
		if(req.files['resume_file']) {
			if(user.resume_file) {
				// delete existing resume file
				gfs.remove({filename: user.resume_file.split('files/')[1], root: 'uploads'}, (err, result) => {
					if(err) {
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
		if(!user.created_at) {
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

// @route POST
// @desc save edits to current org account's profile
router.post('/profile/org', upload.single('avatar'), (req, res) => {
	let data = req.body;
	const currentAcc = req.user;

	console.log('POST on /profile/org');

	Org.findOne({'username': currentAcc.username}, (err, org) => {
		if(err) {
			res.send('Database error...');
			console.log(err);
			return;
		}
		console.log(org);
		if(req.file) {
			if(	org.avatar != 'https://cdn0.iconfinder.com/data/icons/users-android-l-lollipop-icon-pack/24/group2-512.png') {
				// delete existing avatar file
				gfs.remove({filename: org.avatar.split('files/')[1], root: 'uploads'}, (err, result) => {
					if(err) {
						console.log(err);
					} else {
						console.log(result);
					}
				});
			}
 			org.avatar = '/files/' + req.file.filename;
		}
		org.name = data.name;
		org.email = data.email;
		org.hashtags = data.hashtags;
		org.desc = data.desc;
		org.facebook = data.facebook;
		org.website = data.website;
		if(!org.created_at) {
			org.created_at = new Date();
		}
		org.updated_at = new Date();

		org.save().then(result => {
			console.log(result);
			res.redirect('/profile');
		}).catch(err => {
			res.send(err);
		});
	});
});

// Multer
router.use(multer().single());

//@route POST
//@desc Follower/Following func
router.post('/follow', (req, res) => {
	let org_id = req.body.org_id;
	let user_id = req.body.user_id;
	let follow = req.body.follow;
	console.log(req.body);
	if (follow == "true")
	{
			User.findOne({'_id': user_id}, (err, user) => {
			if(err) {
				res.send("Database error!");
				console.log(err);
				return;
			}
			Org.findOne({'_id': org_id}, (err, org) => {
				if(err) {
					res.send('Database error!');
					console.log(err);
					return;
				}
				if (user.following.indexOf(org.username) < 0)
				{
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
				else
				{
					res.send("Unexpected Error!")
				}
			}).catch(err => {
				res.send(err);
			});
		});
	}
	else if (follow == "false")
	{
		User.findOne({'_id': user_id}, (err, user) => {
			if(err) {
				res.send("Database error!");
				console.log(err);
				return;
			}
			Org.findOne({'_id': org_id}, (err, org) => {
				if(err) {
					res.send('Database error!');
					console.log(err);
					return;
				}
				if (user.following.indexOf(org.username) > -1)
				{
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

//view followers/following orgs
router.get('/:username/following', (req, res) => {
	let account_type = req.user.account_type;
	let account_id = req.user.account_id;
	let username = req.params.username;
	if (account_type == 0 && username == req.user.username) 
	{
			User.findOne({'username': username}, (err, user) => {
					if (err) {
							res.redirect('/');
							console.log(err);
					}
					Org.find({'username': {$in: user.following}}, (err, orgs) => {
							if (err) {
									res.redirect('/');
									console.log(err);
							}
							res.render('following', {
									title: 'ChanceMap | Following',
									currentAcc: user,
									account_type: account_type,
									account_id: account_id,
									criteriaList: user.interests.concat(user.skills),
									orgs: orgs,
									notis: req.notis
							});
					});
			});
	}
	else 
	{
			res.redirect('/');
	}
});

router.get('/:orgname/followers', (req, res) => {
	let account_type = req.user.account_type;
	let account_id = req.user.account_id;
	let orgname = req.params.orgname;
	if (account_type == 1 && orgname == req.user.username) 
	{
			Org.findOne({'username': orgname}, (err, org) => {
					if (err) {
							res.redirect('/');
							console.log(err);
					}
					User.find({'username': {$in: org.followers}}, (err, users) => {
							if (err) {
									res.redirect('/');
									console.log(err);
							}
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
			});
	}
	else 
	{
			res.redirect('/');
	}
});

// Notifications
router.get('/notifications', (req, res) => {
	if(req.isAuthenticated()) {
		Notification.find({'accounts': req.user.username}, (err, notis) => {
			if(err) {
				console.log(err);
				return;
			}
			if(req.user.account_type == 0) {
			User.findOne({'username': req.user.username}, (err, user) => {
				res.render('notification', {
					title: 'ChanceMap | Notifications',
					currentAcc: user,
					account_type: req.user.account_type,
					account_id: req.user.account_id,
					notis: notis
				});
			});
		} else {
			Org.findOne({'username': req.user.username}, (err, org) => {
				res.render('notification', {
					title: 'ChanceMap | Notifications',
					currentAcc: org,
					account_type: req.user.account_type,
					account_id: req.user.account_id,
					notis: notis
				});
			});
		}
		});
	} else {
		res.redirect('/login');
	}
});

router.get('/clear-notifications', (req, res) => {
	if(req.isAuthenticated()) {
		let account_id = req.query.account_id;
		let account_type = req.query.account_type;
		console.log(typeof(account_type));
		console.log(account_type);
		if(account_type == '0') {
			console.log('user');
			User.findOne({'_id': account_id}, (err, user) => {
				user.new_notis = [];
				user.save().then(result => {
					res.send(result);
				}).catch(err => {
					res.send(err);
				});
			});
		} else {
			console.log('org');
			Org.findOne({'_id': account_id}, (err, org) => {
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

// Exports
module.exports = router;
