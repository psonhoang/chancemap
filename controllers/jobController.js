const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const config = require('../config/database.js');
const Grid = require('gridfs-stream');

// Models
const User = require('../models/user');
const Job = require('../models/job');
const Org = require('../models/org');
const Admin = require('../models/admin');
const Notification = require('../models/notification');

const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');

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

// Database connection
const connection = mongoose.connection;

// Init gfs
let gfs;
connection.once('open', () => {
	// Init stream
	gfs = Grid(connection.db, mongoose.mongo);
	gfs.collection('uploads');
});

//Utility Functions
function sortByHashtags(list, properties, criteria) {
	list.forEach(item => {
		item.matches = 0;
		properties.forEach(property => {
			item[property].forEach(tag => {
				criteria.forEach(criterion => {
					if (tag.includes(criterion)) {
						item.matches++;
					}
				});
			});
		});
	});
	list.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
	return list;
}

// @Routes
router.get('/manage', async (req, res) => {

	let users = await User.find();
	let account_id = req.user.account_id;
	let account_type = req.user.account_type;

	var jobs;
	var currentAcc;
	var connected;

	if (account_type == 1) {
		jobs = await Job.find({ org_id: account_id });
		currentAcc = await Org.findOne({ _id: account_id });
		connected = users.filter(user => currentAcc.followers.indexOf(user.username) >= 0);
	} else if (account_type == 2) {
		jobs = await Job.find();
		currentAcc = await Admin.findOne({ _id: account_id });
		connected = [];
	}
	else {
		res.redirect("/");
		return;
	}

	res.render('jobs/orgs/manage', {
		title: 'ChanceMap | My Jobs',
		account_type: account_type,
		account_id: account_id,
		currentAcc: currentAcc,
		jobs: jobs,
		notis: req.notis,
		connected: connected,
		users: users,
	});
});

// Jobs dashboard - view all jobs except yours
router.get('/', async (req, res) => {

	let users = await User.find();
	let jobs = await Job.find();

	let account_id = req.user.account_id;
	let account_type = req.user.account_type;

	var criteriaList;
	var connected;
	var currentAcc;

	if (account_type == 1) {
		currentAcc = await Org.findOne({ _id: account_id });
		connected = users.filter(user => currentAcc.followers.indexOf(user.username) >= 0);
		criteriaList = currentAcc.hashtags;
		jobs = sortByHashtags(jobs, ['hashtags'], criteriaList);
	} else if (account_type == 2) {
		currentAcc = await Admin.findOne({ _id: account_id });
		criteriaList = [];
		connected = [];
	} else {
		currentAcc = await User.findOne({ _id: account_id });
		criteriaList = currentAcc.interests.concat(currentAcc.skills);
		connected = users.filter(client => currentAcc.connected.indexOf(client.username) >= 0);
		jobs = sortByHashtags(jobs, ['hashtags'], criteriaList);
	}

	res.render('jobs/dashboard', {
		title: 'ChanceMap | Jobs',
		account_type: account_type,
		account_id: account_id,
		currentAcc: currentAcc,
		criteriaList: criteriaList,
		jobs: jobs,
		notis: req.notis,
		connected: connected,
		users: users,
	});
});

// Create new job
// Render edit view
router.get('/create', async (req, res) => {

	let account_id = req.user.account_id;
	let account_type = req.user.account_type;

	var connected;
	var currentAcc;

	if (req.user.account_type == 0) {
		res.redirect('/');
	}

	if (account_type == 1) {
		currentAcc = await Org.findOne({ _id: account_id });
		users = await User.find();
		connected = users.filter(user => currentAcc.followers.indexOf(user.username) >= 0);
	} else {
		currentAcc = await Admin.findOne({ _id: account_id });
		connected = [];
	}

	res.render('jobs/orgs/create', {
		title: 'ChanceMap | Add a new Job',
		account_type: account_type,
		account_id: account_id,
		currentAcc: currentAcc,
		notis: req.notis,
		connected: connected,
	});
});

// Process edit information
router.post('/create', upload.single(), async (req, res) => {

	let data = req.body;
	let org;

	if (req.user.account_type != 2) {
		org = await Org.findOne({ '_id': req.user.account_id });
	} else {
		org = await Org.findOne({ 'name': data.org_name });
	}
	let name = data.name;
	let org_id = org._id;
	let org_name = data.org_name;
	let desc = data.desc;
	let hashtags = data.hashtags;
	let app_form = data.app_form;
	let app_deadline = data.app_deadline;
	let facebook = data.facebook;
	let website = data.website;
	let jobImage = data.jobImage;

	//Create new job object
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
		if (err) {
			console.log(err);
			return;
		}
		console.log('New job created!');

		org.jobs.push(job._id);
		org.save().then().catch(err => { res.send(err); });
		let accounts = [];

		if (org.followers) {
			accounts = org.followers;
		}

		// Create notifications
		let newNoti = new Notification({
			_id: new mongoose.Types.ObjectId(),
			created_at: new Date(),
			updated_at: new Date(),
			title: org.name + ' added a new job position!',
			body: org.name + ' is recruiting ' + job.name,
			image: 'job',
			accounts: accounts
		});

		newNoti.save().then(async noti => {
			console.log(noti);
			let users = await User.find({ 'username': { $in: accounts } });
			users.forEach(user => {
				user.new_notis.push(noti._id);
				user.save().then().catch(err => {
					res.send(err);
				});
			});
			res.redirect("/jobs/manage");
		}).catch(err => { throw (err); });
	});
});

// Edit an existing job
router.get('/manage/edit/:ID', async (req, res) => {

	let job = await Job.findOne({ _id: req.params.ID });

	let account_id = req.user.account_id;
	let account_type = req.user.account_type;

	var currentAcc;
	var connected;

	if (account_type == 1) {
		currentAcc = await Org.findOne({ _id: account_id });
		let users = await User.find();
		connected = users.filter(user => currentAcc.followers.indexOf(user.username) >= 0);
	} else if (account_type == 2) {
		connected = [];
		currentAcc = await Admin.findOne({ _id: account_id });
	}

	res.render('jobs/orgs/edit', {
		title: 'ChanceMap | Edit Job',
		account_type: req.user.account_type,
		account_id: req.user.account_id,
		currentAcc: currentAcc,
		job: job,
		notis: req.notis,
		connected: connected,
	});
});

//Process edited information
router.post('/edit/:id', upload.single(), async (req, res) => {

	let job = await Job.findOne({ '_id': req.params.id });
	let data = req.body;
	let org;

	if (req.user.account_type != 2) {
		org = await Org.findOne({ '_id': req.user.account_id });
	} else {
		org = await Org.findOne({ 'name': data.org_name });
	}
	let name = data.name;
	let org_id = org._id;
	let org_name = data.org_name;
	let desc = data.desc;
	let hashtags = data.hashtags;
	let app_form = data.app_form;
	let app_deadline = data.app_deadline;
	let facebook = data.facebook;
	let website = data.website;
	let jobImage = data.jobImage;
	let accounts = [];

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
		if (org.followers) {
			accounts = org.followers;
		}
		let newNoti = new Notification({
			_id: new mongoose.Types.ObjectId(),
			created_at: new Date(),
			updated_at: new Date(),
			title: org_name + ' just editited their job position!',
			body: org_name + ' made an edit to ' + job.name,
			image: 'job',
			accounts: accounts
		});

		newNoti.save().then(noti => {
			console.log(noti);
			User.find({ 'username': { $in: accounts } }, (err, users) => {
				users.forEach(user => {
					user.new_notis.push(noti._id);
					user.save().then().catch(err => {
						res.send(err);
					});
				});
				res.redirect("/jobs/manage");
				return;
			}).catch(err => { throw (err); });
		}).catch(err => { throw (err); });
	}).catch(err => { throw (err); });
});

//Delete a job when requested
router.post('/delete', upload.single(), (req, res) => {

	let account_type = req.user.account_type;
	let data = req.body;

	if (account_type != 1 && account_type != 2) {
		res.redirect('/');
		return;
	}

	if (data.JobID != undefined) {
		Job.findOneAndRemove({ _id: data.JobID }, (err, job) => {
			if (err) {
				console.log(err);
				return;
			}
			Org.findOne({ '_id': job.org_id }, (err, org) => {
				if (err) {
					console.log(err);
					return;
				}
				if (org.followers.length > 0) {

					let newNoti = new Notification({
						_id: new mongoose.Types.ObjectId(),
						created_at: new Date(),
						updated_at: new Date(),
						title: org.name + ' just removed a job position!',
						body: org.name + ' removed ' + job.name,
						image: 'job',
						accounts: org.followers
					});

					newNoti.save().then(noti => {
						User.find({ 'username': { $in: org.followers } }, (err, users) => {
							users.forEach(user => {
								user.new_notis.push(noti._id);
								user.save().then(result => {
								}).catch(err => {
									throw (err);
								});
							});
							res.redirect('jobs/manage');
						});
					}).catch(err => { throw (err); });
				} else {
					res.redirect('jobs/manage');
				}
			});
		});
	}
});

module.exports = router;