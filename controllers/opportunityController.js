const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

//Modals
const Opportunity = require('../models/opportunity');
const Org = require('../models/org');
const User = require('../models/user');
const Admin = require('../models/admin');

//Utity functions
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

//opportunitiesdashboard

router.get('/', async (req, res) => {

	let account_type = req.user.account_type;
	let account_id = req.user.account_id;
	let users = await User.find();
	let opportunities = await Opportunity.find();

	var currentAcc;
	var criteriaList;
	var connected;

	if (account_type == 1) {
		currentAcc = await Org.findOne({ '_id': account_id });
		connected = users.filter(user => currentAcc.followers.indexOf(user.username) >= 0);
		criteriaList = currentAcc.hashtags;
		opportunities = sortByHashtags(opportunities, ['hashtags'], criteriaList);
	} else if (account_type == 2) {
		if (req.user.username != "Guest") {
			currentAcc = await Admin.findOne({ '_id': account_id});
		} else {
			currentAcc = users.filter(user => JSON.stringify(user._id) == JSON.stringify(account_id))[0];
		}
		criteriaList = [];
		connected = [];
	} else {
		currentAcc = await User.findOne({ '_id': account_id });
		connected = users.filter(client => currentAcc.connected.indexOf(client.username) >= 0);
		criteriaList = currentAcc.interests.concat(currentAcc.skills);
		opportunities = sortByHashtags(opportunities, ['hashtags'], criteriaList);
	}

	res.render('opportunities/dashboard', {
		title: 'ChanceMap | Opportunities',
		account_type: account_type,
		account_id: account_id,
		currentAcc: currentAcc,
		opportunities: opportunities,
		criteriaList: criteriaList,
		users: users,
		notis: req.notis,
		connected: connected,
	});
});

// Opportunity Manage
router.get('/manage', async (req, res) => {

	let account_type = req.user.account_type;
	let account_id = req.user.account_id;

	if (account_type == 2 && req.user.username != "Guest") {

		const opportunities = await Opportunity.find();
		const admin = await Admin.findOne({ '_id': req.user.account_id });

		res.render('opportunities/manage', {
			title: 'ChanceMap | Manage Opportunities',
			account_type: account_type,
			account_id: account_id,
			currentAcc: admin,
			opportunities: opportunities,
			connected: [],
			notis: req.notis,
		});
	}
	else {
		res.redirect("/");
		return;
	}
});

// Creating a new opportunity
router.get('/create', async (req, res) => {

	let account_type = req.user.account_type;
	let account_id = req.user.account_id;

	if (account_type == 2 && req.user.username != "Guest") {

		const admin = await Admin.findOne({ '_id': account_id });

		res.render('opportunities/create', {
			title: 'ChanceMap | Add a new Opportunity',
			account_type: account_type,
			account_id: account_id,
			currentAcc: admin,
			connected: [],
			notis: req.notis,
		});
	} else {
		res.redirect("/");
		return;
	}
});

// Process new opportunity information
router.post('/create', (req, res) => {

	let data = req.body;

	let name = data.name;
	let org_name = data.org_name;
	let desc = data.desc;
	let hashtags = data.hashtags;
	let app_form = data.app_form;
	let app_deadline = data.app_deadline;
	let start_date = data.start_date;
	let end_date = data.end_date;
	let facebook = data.facebook;
	let website = data.website;

	var newOpportunity = new Opportunity({
		_id: new mongoose.Types.ObjectId(),
		created_at: new Date(),
		updated_at: new Date(),
		name: name,
		org_name: org_name,
		desc: desc,
		hashtags: hashtags,
		app_form: app_form,
		app_deadline: app_deadline,
		start_date: start_date,
		end_date: end_date,
		facebook: facebook,
		website: website,
	});

	newOpportunity.save().then(opportunity => {
		console.log('New opportunity created!');
		res.redirect('/opportunities/manage');
	}).catch(err => { res.send(err); });
});


// Deleting opportunities (orgs)
router.get('/delete/:id', (req, res) => {

	let account_type = req.user.account_type;
	let opportunity_id = req.params.id;

	if (account_type == 2 && req.user.username != "Guest") {
		Opportunity.findOneAndRemove({ _id: opportunity_id }, (err, opportunity) => {
			if (err) {
				console.log(err);
			}
			console.log(opportunity);
			res.redirect('/opportunities/manage');
		});
	} else {
		res.redirect('/');
		return;
	}
});

// Editing existing opportunities
router.get('/edit/:id', (req, res) => {

	let account_type = req.user.account_type;
	let account_id = req.user.account_id;

	if (account_type == 2 && req.user.username != "Guest") {
		Opportunity.findOne({ _id: req.params.id }, async (err, opportunity) => {
			if (err) {
				console.log(err);
				return;
			}
			const currentAcc = await Admin.findOne({ '_id': account_id });
			let connected = [];
			res.render('opportunities/edit', {
				title: 'ChanceMap | Manage Opportunities',
				account_type: account_type,
				account_id: account_id,
				currentAcc: currentAcc,
				opportunity: opportunity,
				connected: connected,
				notis: req.notis,
			});
		});
	}
	else {
		res.redirect('/');
		return;
	}
});


router.post('/edit/:id', (req, res) => {

	let data = req.body;

	let opportunity_id = req.params.id;
	let name = data.name;
	let desc = data.desc;
	let hashtags = data.hashtags;
	let app_form = data.app_form;
	let app_deadline = data.app_deadline;
	let facebook = data.facebook;
	let website = data.website;
	let start_date = data.start_date;
	let end_date = data.end_date;

	Opportunity.findOne({ _id: opportunity_id }, (err, opportunity) => {
		if (err) {
			res.send('Database error...');
			console.log(err);
			return;
		}

		console.log(opportunity);
		if (!opportunity.created_at) {
			opportunity.created_at = new Date();
		}
		opportunity.updated_at = new Date();

		opportunity.name = name;
		opportunity.desc = desc;
		opportunity.hashtags = hashtags;
		opportunity.app_form = app_form;
		opportunity.app_deadline = app_deadline;
		opportunity.start_date = start_date;
		opportunity.end_date = end_date;
		opportunity.facebook = facebook;
		opportunity.website = website;

		opportunity.save().then(result => {
			console.log(result);
			res.redirect('/opportunities/manage');
		}).catch(err => {
			res.send(err);
		});
	});
});

// Exports
module.exports = router;