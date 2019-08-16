const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Grid = require('gridfs-stream');

// Models
const Event = require('../models/event');
const User = require('../models/user');
const Job = require('../models/job');
const Org = require('../models/org');
const Admin = require('../models/admin');
const OrgProfile = require('../models/orgProfile');

// Database connection
const connection = mongoose.connection;

// Init gfs
let gfs;
connection.once('open', () => {
	// Init stream
	gfs = Grid(connection.db, mongoose.mongo);
	gfs.collection('uploads.files');
});

// Utility Functions
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
//View dashboard
router.get('/', async (req, res) => {

	let account_type = req.user.account_type;
	let account_id = req.user.account_id;

	let orgs = await Org.find();
	let users = await User.find();

	var criteriaList;
	var currentAcc;
	var connected;

	if (account_type == 1) {
		currentAcc = await Org.findOne({ '_id': account_id });
		criteriaList = currentAcc.hashtags;
		orgs = sortByHashtags(orgs, ['hashtags'], criteriaList);
		connected = users.filter(user => currentAcc.followers.indexOf(user.username) >= 0);
	}
	else if (account_type == 2) {
		currentAcc = await Admin.findOne({ '_id': account_id });
		criteriaList = [];
		connected = [];
	}
	else {
		currentAcc = users.filter(user => JSON.stringify(user._id) == JSON.stringify(account_id))[0];
		criteriaList = currentAcc.interests.concat(currentAcc.skills);
		orgs = sortByHashtags(orgs, ['hashtags'], criteriaList);
		connected = users.filter(user => currentAcc.connected.indexOf(user.username) >= 0);
	}

	res.render('orgs/dashboard', {
		title: 'ChanceMap | Orgs',
		account_type: account_type,
		account_id: account_id,
		currentAcc: currentAcc,
		orgs: orgs,
		connected: connected,
		users: users,
		type: 'orgs',
		criteriaList: criteriaList,
		notis: req.notis
	});
});

//View Org Profiles
router.get('/:username', async (req, res) => {

	let account_type = req.user.account_type;
	let account_id = req.user.account_id;
	let orgUsername = req.params.username;

	let orgs = await Org.find();
	let users = await User.find();
	let jobs = await Job.find();
	let events = await Event.find();

	var orgToView = orgs.filter(org => JSON.stringify(org.username) == JSON.stringify(orgUsername))[0];
	if (!orgToView) {
		redirect('/');
		return;
	}
	var similarOrgs = sortByHashtags(orgs, ['hashtags'], orgToView.hashtags).splice(1,5); //Find 4 most similar orgs to the org to viewed
	events = events.filter(event => orgToView.events.indexOf(event._id) >= 0);
	jobs = jobs.filter(job => orgToView.jobs.indexOf(job._id) >= 0);
	var profile = await OrgProfile.findOne({ 'org_id': orgToView._id });

	var currentAcc;
	var criteriaList;
	var connected;

	if (account_type == 1) {
		currentAcc = orgs.filter(org => JSON.stringify(org._id) == JSON.stringify(account_id))[0];
		criteriaList = currentAcc.hashtags;
		connected = users.filter(user => currentAcc.followers.indexOf(user.username) >= 0);
	}
	else if (account_type == 0) {
		currentAcc = users.filter(user => JSON.stringify(user._id) == JSON.stringify(account_id))[0];
		criteriaList = currentAcc.interests.concat(currentAcc.skills),
		connected = users.filter(user => currentAcc.connected.indexOf(user.username) >= 0);
	}
	else if (account_type == 2) {
		currentAcc = await Admin.findOne({ '_id': account_id});
		criteriaList = [];
		connected = [];
	}

	res.render('orgs/profile', {
		title: orgToView.name,
		account_type: account_type,
		account_id: account_id,
		criteriaList: criteriaList,
		currentAcc: currentAcc,
		org: orgToView,
		orgs: similarOrgs,
		profile: profile,
		jobs: jobs,
		events: events,
		connected: connected,
		users: users,	
		notis: req.notis
	});
});

//View Followers
router.get('/:orgname/followers', async (req, res) => {

	let account_type = req.user.account_type;
	let account_id = req.user.account_id;
	let orgname = req.params.orgname;

	if (account_type != 1 || orgname != req.user.username) {
		res.redirect('/');
		return;
	}

	let currentAcc = await Org.findOne({ 'username': orgname });
	let users = await User.find({ 'username': { $in: currentAcc.followers } });
	let criteriaList = currentAcc.hashtags;

	res.render('followers', {
		title: 'ChanceMap | Followers',
		currentAcc: currentAcc,
		account_type: account_type,
		account_id: account_id,
		criteriaList: criteriaList,
		users: users,
		notis: req.notis
	});
});


// Exports
module.exports = router;
