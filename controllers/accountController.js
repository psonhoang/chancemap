const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const passport = require('passport');

// Models
const Account = require('../models/account');
const User = require('../models/user');
const Org = require('../models/org');

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

router.post('/register/user', (req, res) => {
	console.log(req.body);

	let data = req.body;
	let name = data.name;
	let username = data.username;
	let email = data.email;
	let password = data.password;
	let interests = data.interests;
	let skills = data.skills;
	let resume_file = data.resume_file;
	let school = data.school;
	let intro = data.intro;
	let facebook = data.facebook;
	let website = data.website;
	let avatar = data.avatar;

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

router.post('/register/org', (req, res) => {
	console.log(req.body);

	let data = req.body;
	let name = data.name;
	let username = data.username;
	let email = data.email;
	let password = data.password;
	let hashtags = data.hashtags;
	let desc = data.desc;
	let facebook = data.facebook;
	let website = data.website;
	let avatar = data.avatar;

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

module.exports = router;
