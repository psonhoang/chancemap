const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const config = require('../config/database.js');

// Models
const Account = require('../models/account');
const User = require('../models/user');
const Job = require('../models/job');

router.get('/job', (req, res) => {
	if (req.user.account_type == 1)
	{
		Job.find({'org_id': req.user.account_id}, (err, jobs) => {
			//console.log(jobs);
			res.render('jobs/orgs/job', {
				title: 'CodeDao | Jobs',
				account_type: req.user.account_type,
				account_id: req.user.account_id,
				currentAcc: req.user,
				jobs: jobs
			});
		});
	}
	else 
	{
		User.findOne({'_id': req.user.account_id}, (err, theuser) => {
			Job.find({'_id': theuser.jobs}, (err, jobs) => {
				//console.log(jobs);
				res.render('jobs/users/job', {
					title: 'CodeDao | Jobs',
					account_type: req.user.account_type,
					account_id: req.user.account_id,
					currentAcc: req.user,
					jobs: jobs
				});
			});
		});
	}
});

router.get('/job/add', (req, res) => {
	if (req.user.account_type != 1)
		res.redirect('/job');
	else 
		res.render('jobs/orgs/addJob', {
		title: 'CodeDao | Jobs',
		account_type: req.user.account_type,
		account_id: req.user.account_id,
		currentAcc: req.user
	});
});

//create new job
router.post('/job/add', (req, res) => {
	//console.log(req.body);

	let data = req.body;
	let name = data.name;
	let org_id = req.user.account_id;
	let org_name = data.org_name;
	let desc = data.desc;
	let hashtags = data.hashtags;
	let app_form = data.app_form;
	let app_deadline = data.app_deadline;
	let facebook = data.facebook;
	let website = data.website;
	let jobImage = data.jobImage;

	var newJob = new Job({
		_id: new mongoose.Types.ObjectId(),
		name: name,
		org_id: org_id,
		org_name: org_name,
		desc: desc,
		hashtags: hashtags,
		app_form: app_form,
		app_deadline: app_deadline,
		facebook: facebook,
		website: website,
		jobImage: jobImage
	});

	newJob.save((err, jobs) => {
		if(err) {
			console.log(err);
			return;
		  }
		  console.log(jobs); 
	});

	res.redirect('/job');
});

module.exports = router;