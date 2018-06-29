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
	if (req.user.account_type == 1)
	{
		Job.find({'org_id': req.user.account_id}, (err, jobs) => {
			//console.log(jobs);
			Org.findOne({_id: req.user.account_id}, (err, org) => {
				res.render('jobs/orgs/manage', {
					title: 'CodeDao | Jobs',
					account_type: req.user.account_type,
					account_id: req.user.account_id,
					currentAcc: org,
					jobs: jobs
				});
			});
		});
	}
	// else
	// {
	// 	User.findOne({'_id': req.user.account_id}, (err, theuser) => {
	// 		Job.find({'_id': theuser.jobs}, (err, jobs) => {
	// 			//console.log(jobs);
	// 			res.render('jobs/users/job', {
	// 				title: 'CodeDao | Jobs',
	// 				account_type: req.user.account_type,
	// 				account_id: req.user.account_id,
	// 				currentAcc: req.user,
	// 				jobs: jobs
	// 			});
	// 		});
	// 	});
	// }
});

router.get('/add', (req, res) => {
	if (req.user.account_type != 1)
		res.redirect('/');
	else
		Org.findOne({_id: req.user.account_id}, (err, org) => {
			res.render('jobs/orgs/add', {
				title: 'CodeDao | Add A New Job',
				account_type: req.user.account_type,
				account_id: req.user.account_id,
				currentAcc: org
			});
		});
});

//create new job
router.post('/add', (req, res) => {
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

	res.redirect('/');
});

module.exports = router;
