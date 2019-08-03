const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Grid = require('gridfs-stream');

// Models
const User = require('../models/user');
const Org = require('../models/org');
const Job = require('../models/job');
const Event = require('../models/event');
const Opportunity = require('../models/opportunity');

// Database connection
const connection = mongoose.connection;

// Init gfs
let gfs;
connection.once('open', () => {
	// Init stream
	gfs = Grid(connection.db, mongoose.mongo);
	gfs.collection('uploads');
});

//Utility Function
function sort(list, properties, criteria) {
	var sortedList = [];
	list.forEach(item => {
		item.matches = 0;
		properties.forEach(property => {
			if (typeof item[property] === "object") {
				criteria.forEach(criterion => {
					item[property].forEach(tag => {
						if (tag.includes(criterion)) {
							item.matches++;
						}
					});
				});
			} else if (typeof item[property] === "string") {
				criteria.forEach(criterion => {
					if (item[property].toLowerCase().includes(criterion)) {
						item.matches++;
					}
				});
			}
		});
		if (item.matches > 0) {
			sortedList.push(item);
		}
	});
	sortedList.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
	return sortedList;
}

function onlyUnique(value, index, self) {
	return self.indexOf(value) === index;
}

// *** ROUTES ***

// @Routes: /search/orgs
router.get('/orgs', async (req, res) => {

	let account_id = req.user.account_id;
	let account_type = req.user.account_type;

	let orgs = await Org.find();
	let users = await User.find();

	const criteriaList = req.query.criteriaList;
	orgs = sort(orgs, ["hashtags", "username", "name"], criteriaList);

	var currentAcc;
	var connected;
	var view;

	if (account_type == 1) {
		currentAcc = await Org.findOne({ '_id': account_id });
		connected = users.filter(user => currentAcc.followers.indexOf(user.username) >= 0);
		view = ['orgs/dashboard', 'Orgs'];
	} else {
		currentAcc = await User.findOne({ '_id': account_id });
		connected = users.filter(client => currentAcc.connected.indexOf(client.username) >= 0);
		if (req.query.isFollowing) {
			orgs = orgs.filter(org => currentAcc.following.indexOf(org.username) >= 0);
			view = ['following', 'Following'];
		} else {
			view = ['orgs/dashboard', 'Orgs'];
		}
	}
	res.render(view[0], {
		title: 'ChanceMap | ' + view[1],
		orgs: orgs,
		criteriaList: criteriaList,
		account_type: account_type,
		account_id: account_id,
		currentAcc: currentAcc,
		notis: req.notis,
		connected: connected,
	});
});

// @Routes: /search/users
router.get('/users', async (req, res) => {

	let account_id = req.user.account_id;
	let account_type = req.user.account_type;

	let users = await User.find();

	const criteriaList = req.query.criteriaList;
	users = sort(users, ['interests', 'skills', 'username', 'name'], criteriaList);

	var currentAcc;
	var connected;
	var view;

	if (account_type == 1) {
		currentAcc = await Org.findOne({ '_id': account_id });
		connected = users.filter(user => currentAcc.followers.indexOf(user.username) >= 0);
		if (req.query.isFollower) {
			view = ["followers", "Followers"];
		} else {
			view = ["users/dashboard", "Users"];
		}
	} else {
		currentAcc = await User.findOne({ '_id': account_id });
		connected = users.filter(client => currentAcc.connected.indexOf(client.username) >= 0);
		view = ["users/dashboard", "Users"];
	}

	res.render(view[0], {
		title: 'ChanceMap | ' + view[1],
		users: users,
		criteriaList: criteriaList,
		account_type: account_type,
		account_id: account_id,
		currentAcc: currentAcc,
		notis: req.notis,
		connected: connected
	});
});

// @Routes: /search/jobs
router.get('/jobs', async (req, res) => {

	let account_id = req.user.account_id;
	let account_type = req.user.account_type;
	let criteriaList = req.query.criteriaList;

	let jobs = await Job.find();
	let users = await User.find();

	var currentAcc;
	var connected;

	jobs = sort(jobs, ["org_name", "name", "hashtags"], criteriaList);

	if (account_type == 1) {
		currentAcc = await Org.findOne({ '_id': account_id });
		connected = users.filter(user => currentAcc.followers.indexOf(user.username) >= 0);
	} else {
		currentAcc = await User.findOne({ '_id': account_id });
		connected = users.filter(client => currentAcc.connected.indexOf(client.username) >= 0);
	}

	res.render('jobs/dashboard', {
		title: 'ChanceMap | Jobs',
		jobs: jobs,
		criteriaList: criteriaList,
		account_type: account_type,
		account_id: account_id,
		currentAcc: currentAcc,
		notis: req.notis,
		connected: connected
	});
});

// @Routes: /search/events
router.get('/events', async (req, res) => {

	let account_id = req.user.account_id;
	let account_type = req.user.account_type;
	let criteriaList = req.query.criteriaList;

	let events = await Event.find();
	let users = await User.find();

	var currentAcc;
	var connected;

	events = sort(events, ["org_name", "name", "hashtags"], criteriaList);

	if (account_type == 1) {
		currentAcc = await Org.findOne({ '_id': account_id });
		connected = users.filter(user => currentAcc.followers.indexOf(user.username) >= 0);
	} else {
		currentAcc = await User.findOne({ '_id': account_id });
		connected = users.filter(client => currentAcc.connected.indexOf(client.username) >= 0);
	}

	res.render('events/dashboard', {
		title: 'ChanceMap | Jobs',
		events: events,
		criteriaList: criteriaList,
		account_type: account_type,
		account_id: account_id,
		currentAcc: currentAcc,
		notis: req.notis,
		connected: connected
	});
});


// @Routes /search/opportunities
router.get('/opportunities', async (req, res) => {

	let account_id = req.user.account_id;
	let account_type = req.user.account_type;
	let criteriaList = req.query.criteriaList;

	let opportunities = await Opportunity.find();
	let users = await User.find();

	var currentAcc;
	var connected;

	opportunities = sort(opportunities, ["org_name", "name", "hashtags"], criteriaList);

	if (account_type == 1) {
		currentAcc = await Org.findOne({ '_id': account_id });
		connected = users.filter(user => currentAcc.followers.indexOf(user.username) >= 0);
	} else {
		currentAcc = await User.findOne({ '_id': account_id });
		connected = users.filter(client => currentAcc.connected.indexOf(client.username) >= 0);
	}

	res.render('opportunities/dashboard', {
		title: 'ChanceMap | Jobs',
		opportunities: opportunities,
		criteriaList: criteriaList,
		account_type: account_type,
		account_id: account_id,
		currentAcc: currentAcc,
		notis: req.notis,
		connected: connected
	});
});

// @Routes /search/
router.get('/', async (req, res) => {
	
	let account_id = req.user.account_id;
	let account_type = req.user.account_type;
	let criteriaList = req.query.criteriaList;

	let events = await Event.find();
	let jobs = await Job.find();
	let opportunities = await Opportunity.find();
	let users = await User.find();
	let orgs = await Org.find();

	opportunities = sort(opportunities, ["org_name", "name", "hashtags"], criteriaList);
	events = sort(events, ["org_name", "name", "hashtags"], criteriaList);
	jobs = sort(jobs, ["org_name", "name", "hashtags"], criteriaList);
	users = sort(users, ["username", "name", "interests", "skills"], criteriaList);
	orgs = sort(orgs, ["username", "name", "hashtags"], criteriaList);


	var currentAcc;
	var connected;

	if (account_type == 1) {
		currentAcc = await Org.findOne({ '_id': account_id });
		connected = users.filter(user => currentAcc.followers.indexOf(user.username) >= 0);
	} else {
		currentAcc = await User.findOne({ '_id': account_id });
		connected = users.filter(client => currentAcc.connected.indexOf(client.username) >= 0);
	}

	res.render('index', {
		title: 'ChanceMap | Home',
		events: events,
		jobs: jobs,
		orgs: orgs,
		users: users,
		opportunities: opportunities,
		criteriaList: criteriaList,
		account_type: account_type,
		account_id: account_id,
		currentAcc: currentAcc,
		notis: req.notis,
		connected: connected
	});
});

router.post('/preview-tags', (req, res) => {
	let wordsInput = req.body.wordsInput;
	User.find({
		$or: [
			{
				interests: {
					$regex: new RegExp(wordsInput)
				}
			},
			{
				skills: {
					$regex: new RegExp(wordsInput)
				}
			}
		]
	}, function (err, data) {
		var searchArray = [];
		data.forEach(entry => {
			searchArray = searchArray.concat(entry.interests);
			searchArray = searchArray.concat(entry.skills);
		});
		Org.find({
			hashtags: {
				$regex: new RegExp(wordsInput)
			}
		}, (err, org_data) => {
			org_data.forEach(org_entry => {
				searchArray = searchArray.concat(org_entry.hashtags);
			});
			searchArray = searchArray.filter(onlyUnique);
			res.json(searchArray);
		}).limit(10);
	}).limit(10);
});

// Exports
module.exports = router;