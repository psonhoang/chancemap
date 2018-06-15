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

// ***** ROUTES *****
// Login
router.get('/login', (req, res) => {
	res.render('login', {title: "Code Dao | Login"});
});

router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: 'Invalid username or password',
  })(req, res, next);
});

// logout
router.get('/logout', (req, res) => {
	req.logout();
	res.redirect('/login');
});

// Register
router.get('/register', (req, res) => {
	res.render('register', {title: "Code Dao | Sign up"});
});

// @route POST
// @desc Determine which register view to render (regOrg || regUser)
router.post('/register', (req, res) => {
	let data = req.body;
	if(!(data.org_acc || data.user_acc)) {
		res.redirect('/register');
	} else {
		let acc_type = 0;
		if(data.org_acc) { acc_type = 1; }
		if(acc_type == 0) {
			res.render('regUser', {
				title: 'Code Dao | User Sign Up',
				user: data // username, email, password
			});
		} else {
			res.render('regOrg', {
				title: 'Code Dao | Org Sign Up',
				org: data
			});
		}
	}
});

// @route POST
// @desc Register new user account
router.post('/register/user', upload.fields([{name: 'avatar', maxCount: 1}, {name: 'resume_file', maxCount: 1}]),
(req, res) => {
	// console.log(req.body);
	// console.log(req.files);

	let data = req.body;
	let name = data.name;
	let username = data.username;
	let email = data.email;
	let password = data.password;
	let interests = data.interests;
	let skills = data.skills;
	let resume_file = data.resume_file;
	if(req.files['resume_file']) {
		resume_file = 'files/' + req.files['resume_file'][0].filename;
	}
	let school = data.school;
	let intro = data.intro;
	let facebook = data.facebook;
	let website = data.website;
	let avatar = "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Antu_im-invisible-user.svg/2000px-Antu_im-invisible-user.svg.png";
	if(req.files['avatar']) {
		avatar = 'files/' + req.files['avatar'][0].filename;
	}

	var newUser = new User({
		_id: new mongoose.Types.ObjectId(),
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
		avatar: avatar
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
	let username = data.username;
	let email = data.email;
	let password = data.password;
	let hashtags = data.hashtags;
	let desc = data.desc;
	let facebook = data.facebook;
	let website = data.website;
	let avatar = "https://cdn0.iconfinder.com/data/icons/users-android-l-lollipop-icon-pack/24/group2-512.png";
	if(req.file) {
		avatar = 'files/' + req.file.filename;
	}

	var newOrg = new Org({
		_id: new mongoose.Types.ObjectId(),
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
		avatar: avatar
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
// @desc view  & edit current account's profile
router.get('/profile', (req, res) => {
	if(!req.isAuthenticated()) {
    res.redirect('/login');
  } else {
    let account_type = req.user.account_type;
    let account_id = req.user.account_id;
    if(account_type == 0) {
      User.findOne({'_id': account_id}, (err, user) => {
        res.render('profile', {
          title: 'App Dao | My Profile',
          account_type: account_type,
          account_id: account_id,
          currentAcc: user
        });
      });
    } else {
      Org.findOne({'_id': account_id}, (err, org) => {
          res.render('profile', {
            title: 'App Dao | My Profile',
            account_type: account_type,
            account_id: account_id,
            currentAcc: org,
          });
      });
    }
  }
});

// Exports
module.exports = router;
