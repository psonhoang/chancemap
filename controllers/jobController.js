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
const Notification = require('../models/notification');

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
						title: 'ChanceMap | My Jobs',
						account_type: req.user.account_type,
						account_id: req.user.account_id,
						currentAcc: org,
						jobs: jobs,
						notis: req.notis
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
		Job.find({}, (err, jobs) => {
			if (req.user.account_type == 1)
			{
				Org.findOne({_id: req.user.account_id}, (err, org) => {
					let criteriaList = org.hashtags;
	                jobs.forEach(job => {
	                    job.matches = 0;
	                    job.hashtags.forEach(hashtag => {
	                        criteriaList.forEach(criteria => {
	                            if(hashtag.includes(criteria)) {
	                            	job.matches++;
	                            }
	                        });
	                    });
	                });
	                jobs.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
					res.render('jobs/dashboard', {
						title: 'ChanceMap | Jobs',
						account_type: req.user.account_type,
						account_id: req.user.account_id,
						currentAcc: org,
						criteriaList: criteriaList,
						jobs: jobs,
						notis: req.notis
					});
				});
			}
			else
			{
				User.findOne({_id: req.user.account_id}, (err, user) => {
					let criteriaList = user.interests.concat(user.skills);
	                jobs.forEach(job => {
	                    job.matches = 0;
	                    job.hashtags.forEach(hashtag => {
	                        criteriaList.forEach(criteria => {
	                            if(hashtag.includes(criteria)) {
	                            	job.matches++;
	                            }
	                        });
	                    });
	                });
	                jobs.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
					res.render('jobs/dashboard', {
						title: 'ChanceMap | Jobs',
						account_type: req.user.account_type,
						account_id: req.user.account_id,
						currentAcc: user,
						criteriaList: criteriaList,
						jobs: jobs,
						notis: req.notis
					});
				});
			}
		});
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
					title: 'ChanceMap | Add a new Job',
					account_type: req.user.account_type,
					account_id: req.user.account_id,
					currentAcc: org,
					notis: req.notis
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

		newJob.save((err, job) => {
			if(err) {
				console.log(err);
				return;
			  }
			  console.log(job);
			  Org.findOne({'_id': req.user.account_id}, (err, org) => {
                let accounts = [];
                if(org.followers) {
                    accounts = org.followers;
                }
                let newNoti = new Notification({
                    _id: new mongoose.Types.ObjectId(),
                    created_at: new Date(),
                    updated_at: new Date(),
                    title: org.name + ' added a new job position!',
                    body: org.name + ' is recruiting ' + job.name,
                    image: 'job',
                    accounts: accounts
                });

                newNoti.save((err, noti) => {
                    if(err) {
                        console.log(err);
                        return;
                    }
                    console.log(noti);
                    User.find({'username': {$in: accounts}}, (err, users) => {
                        users.forEach(user => {
                            user.new_notis.push(noti._id);
                            user.save().then(result => {
                                console.log(result);
                            }).catch(err => {
                                res.send(err);
                            });
                        });
                        req.socket.broadcast.to(req.user.username).emit('event', noti);
                        res.redirect("/jobs/manage");
                    });
                });
        	});
		});
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
					title: 'ChanceMap | Edit Job',
					account_type: req.user.account_type,
					account_id: req.user.account_id,
					currentAcc: org,
					job: job,
					notis: req.notis
				});
			});
		});
	}
});

router.post('/edit/:id', (req, res) => {
		//console.log(req.body);
		if(!req.isAuthenticated()) {
			res.redirect('/login');
		} else {
			let data = req.body;
			let job_id = req.params.id;
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

			// Fix edit job

			Job.findOne({'_id': job_id}, (err, job) => {
				if(err) {
					console.log(err);
					return;
				}
				job.name = name;
				job.desc = desc;
				job.org_id = org_id;
				job.org_name = org_name;
				job.hashtags = hashtags;
				job.app_form = app_form;
				job.app_deadline = app_deadline;
				job.facebook = facebook;
				job.website = website;
				job.jobImage = jobImage;
				job.updated_at = new Date();

				job.save().then(result => {
					console.log(result);
					Org.findOne({'_id': req.user.account_id}, (err, org) => {
	                    let accounts = [];
	                    if(org.followers) {
	                        accounts = org.followers;
	                    }
	                    let newNoti = new Notification({
	                        _id: new mongoose.Types.ObjectId(),
	                        created_at: new Date(),
	                        updated_at: new Date(),
	                        title: org.name + ' just editited their job position!',
	                        body: org.name + ' made an edit to ' + job.name,
	                        image: 'job',
	                        accounts: accounts
	                    });

	                    newNoti.save((err, noti) => {
	                        if(err) {
	                            console.log(err);
	                            return;
	                        }
	                        console.log(noti);
	                        User.find({'username': {$in: accounts}}, (err, users) => {
	                            users.forEach(user => {
	                                user.new_notis.push(noti._id);
	                                user.save().then(result => {
	                                    console.log(result);
	                                }).catch(err => {
	                                    res.send(err);
	                                });
	                            });
	                            req.socket.broadcast.to(req.user.username).emit('event', noti);
	                            res.redirect("/jobs/manage");
	                        });
	                    });
                	});
				}).catch(err => {
					res.send(err);
				});
			});
		}
});

//delete a job when requested
router.post('/delete', (req, res) => {
	if(!req.isAuthenticated()) {
		res.redirect('/login');
	} else {
		console.log("DELETE!");
		if (req.body.JobID != undefined) {
			Job.findOneAndRemove({_id: req.body.JobID}, (err, job) => {
				if(err) {
					console.log(err);
					return;
				}
				Org.findOne({'_id': req.user.account_id}, (err, org) => {
                    let accounts = [];
                    if(org.followers) {
                        accounts = org.followers;
                    }
                    let newNoti = new Notification({
                        _id: new mongoose.Types.ObjectId(),
                        created_at: new Date(),
                        updated_at: new Date(),
                        title: org.name + ' just removed a job position!',
                        body: org.name + ' removed ' + job.name,
                        image: 'job',
                        accounts: accounts
                    });

                    newNoti.save((err, noti) => {
                        if(err) {
                            console.log(err);
                            return;
                        }
                        console.log(noti);
                        User.find({'username': {$in: accounts}}, (err, users) => {
                            users.forEach(user => {
                                user.new_notis.push(noti._id);
                                user.save().then(result => {
                                    console.log(result);
                                }).catch(err => {
                                    res.send(err);
                                });
                            });
                            req.socket.broadcast.to(req.user.username).emit('event', noti);
                            res.redirect("/jobs/manage");
                        });
                    });
                });
			});
		}
	}
});


module.exports = router;
