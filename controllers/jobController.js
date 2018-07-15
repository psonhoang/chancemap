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
const User = require('../models/user');
const Job = require('../models/job');
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


// @Routes
router.get('/manage', (req, res) => {
	if(!req.isAuthenticated()) {
		res.redirect('/login');
	} else {
		if (req.user.account_type == 1)
		{
			Job.find({org_id: req.user.account_id}, (err, jobs) => {
				//console.log(jobs);
				Org.findOne({_id: req.user.account_id}, (err, org) => {
					res.render('jobs/orgs/manage', {
						title: 'CodeDao | Manage Jobs',
						account_type: req.user.account_type,
						account_id: req.user.account_id,
						currentAcc: org,
						jobs: jobs
					});
				});
			});
		}
		else
		{
			res.redirect("/");
		}
	}
});

// job dashboard - view all jobs except yours
router.get('/', (req, res) => {
	if(!req.isAuthenticated()) {
		res.redirect('/login');
	} else {
		if (req.user.account_type == 1)
		{
			Job.find({org_id : {$ne: req.user.account_id}}, (err, jobs) => {
				Org.findOne({_id: req.user.account_id}, (err, org) => {
					res.render('jobs/dashboard', {
						title: 'CodeDao | Jobs',
						account_type: req.user.account_type,
						account_id: req.user.account_id,
						currentAcc: org,
						criteriaList: org.hashtags,
						jobs: jobs
					});
				});
			});
		}
		else
		{
			Job.find({}, (err, jobs) => {
				User.findOne({_id: req.user.account_id}, (err, user) => {
					res.render('jobs/dashboard', {
						title: 'CodeDao | Jobs',
						account_type: req.user.account_type,
						account_id: req.user.account_id,
						currentAcc: user,
						criteriaList: user.interests.concat(user.skills),
						jobs: jobs
					});
				});
			});
		}
	}
});

// create new job
router.get('/create', (req, res) => {
	if(!req.isAuthenticated()) {
		res.redirect('/login');
	} else {
		if (req.user.account_type != 1)
			res.redirect('/');
		else
			Org.findOne({_id: req.user.account_id}, (err, org) => {
				res.render('jobs/orgs/create', {
					title: 'CodeDao | Create A New Job',
					account_type: req.user.account_type,
					account_id: req.user.account_id,
					currentAcc: org
				});
			});
	}
});

router.post('/create', (req, res) => {
	//console.log(req.body);
	if(!req.isAuthenticated()) {
		res.redirect('/login');
	} else {
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
			created_at: new Date(),
			updated_at: new Date(),
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

		res.redirect('/jobs/manage');
	}
});

// edit an existing job
router.get('/manage/edit/:ID', (req, res) => {
	if(!req.isAuthenticated()) {
		res.redirect('/login');
	} else {
		Job.findOne({_id: req.params.ID}, (err, job) => {
			Org.findOne({_id: req.user.account_id}, (err, org) => {
				res.render('jobs/orgs/edit', {
					title: 'CodeDao | Edit your Job',
					account_type: req.user.account_type,
					account_id: req.user.account_id,
					currentAcc: org,
					job: job
				});
			});
		});
	}
});

router.post('/edit', (req, res) => {
		//console.log(req.body);
		if(!req.isAuthenticated()) {
			res.redirect('/login');
		} else {
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
				_id: req.jobId,
				created_at: new Date(),
				updated_at: new Date(),
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

			res.redirect('/');
		}
});

//delete a job when requested
router.post('/delete', (req, res) => {
	if(!req.isAuthenticated()) {
		res.redirect('/login');
	} else {
		console.log("DELETE!");
		if (req.body.JobID != undefined) {
			Job.findOneAndRemove({_id: req.body.JobID}, (err, job) => {});
		}
		res.redirect("/jobs/manage");
	}
});


module.exports = router;
