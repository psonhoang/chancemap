const express = require('express');
const router = express.Router();
// const bodyParser = require('body-parser');
const mongoose = require('mongoose');
// const path = require('path');
// const config = require('../config/database.js');

const Opportunity = require('../models/opportunity');
const Org = require('../models/org');
const User = require('../models/user');
const Admin = require('../models/admin');
// const Event = require('../models/event');
const Message = require('../models/message');


// Database connection
// const connection = mongoose.connection;

// opportunity view
router.get('/manage', (req, res) => {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
	} else {
		Message.find((err, messages) => {
			if (req.user.account_type == 2) {
				Opportunity.find({}, (err, opportunities) => {
					Admin.findOne({ _id: req.user.account_id }, (err, admin) => {
						res.render('opportunities/manage', {
							title: 'ChanceMap | Manage Opportunities',
							account_type: req.user.account_type,
							account_id: req.user.account_id,
							currentAcc: admin,
							opportunities: opportunities,
							notis: req.notis,
							messages: messages,
						});
					});
				});
			}
			else {
				res.redirect("/");
			}
		})
	}
});

// creating a new opportunity
router.get('/create', (req, res) => {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
	} else {
		let account_type = req.user.account_type;
		let account_id = req.user.account_id;
		if (account_type == 2) {
			Admin.findOne({ '_id': account_id }, (err, admin) => {
				Message.find((err, messages) => {
					res.render('opportunities/create', {
						title: 'ChanceMap | Add a new Opportunity',
						account_type: account_type,
						account_id: account_id,
						currentAcc: admin,
						notis: req.notis,
						messages: messages,
					});
				})
			});
		}
	}
});

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
	newOpportunity.save((err, opportunity) => {
		if (err) {
			console.log(err);
			return;
		} else {
			console.log('new opportunity created!');
			console.log(opportunity);
			res.redirect('/opportunities/manage');
		}
	});
});

//opportunitiesdashboard
router.get('/', (req, res) => {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
	} else {
		let account_type = req.user.account_type;
		let account_id = req.user.account_id;
		User.find((err, users) => {
			Opportunity.find((err, opportunities) => {
				if (err) {
					console.log(err);
					return;
				}
				Message.find((err, messages) => {
					if (account_type == 1) {
						Org.findOne({ '_id': account_id }, (err, org) => {
							let followers = users.filter(user => org.followers.indexOf(user.username) >= 0);
							let criteriaList = org.hashtags;
							opportunities.forEach(opportunity => {
								opportunity.matches = 0;
								opportunity.hashtags.forEach(hashtag => {
									criteriaList.forEach(criteria => {
										if (hashtag.includes(criteria)) {
											opportunity.matches++;
										}
									});
								});
							});
							opportunities.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
							res.render('opportunities/dashboard', {
								title: 'ChanceMap | Opportunities',
								account_type: account_type,
								account_id: account_id,
								currentAcc: org,
								opportunities: opportunities,
								criteriaList: criteriaList,
								notis: req.notis,
								messages: messages,
								connected: followers,
								users: users,
							});
						});
					} else if (account_type == 2) {
						Admin.findOne({ '_id': account_id }, (err, admin) => {
							let criteriaList = [];
							res.render('opportunities/dashboard', {
								title: 'ChanceMap | Opportunities',
								account_type: account_type,
								account_id: account_id,
								currentAcc: admin,
								opportunities: opportunities,
								criteriaList: criteriaList,
								notis: req.notis,
								messages: messages,
								users: users,
							});
						});
					} else {
						User.findOne({ '_id': account_id }, (err, user) => {
							let connected = users.filter(client => user.connected.indexOf(client.username) >= 0);
							let criteriaList = user.interests.concat(user.skills);
							opportunities.forEach(opportunity => {
								opportunity.matches = 0;
								opportunity.hashtags.forEach(hashtag => {
									criteriaList.forEach(criteria => {
										if (hashtag.includes(criteria)) {
											opportunity.matches++;
										}
									});
								});
							});
							opportunities.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
							res.render('opportunities/dashboard', {
								title: 'ChanceMap | Opportunities',
								account_type: account_type,
								account_id: account_id,
								currentAcc: user,
								opportunities: opportunities,
								criteriaList: criteriaList,
								notis: req.notis,
								messages: messages,
								connected: connected,
								users: users,
							});
						});
					}
				})
			});
		});
	}
});

// deleting opportunities (orgs)
router.get('/delete/:id', (req, res) => {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
	} else {
		let account_type = req.user.account_type;
		let data = req.body;
		let opportunity_id = req.params.id;
		let opportunity_name = data.name;
		let org_name = data.org_name;
		let desc = data.desc;
		let hashtags = data.hashtags;
		let app_form = data.app_form;
		let app_deadline = data.app_deadline;
		let facebook = data.facebook;
		let website = data.website;
		let accounts = [];
		let org_followers = data.org_followers;
		if (account_type == 1 || account_type == 2) {
			Opportunity.findOneAndRemove({ _id: opportunity_id }, (err, opportunity) => {
				if (err) {
					console.log(err);
				} else {
					console.log(opportunity);
					res.redirect('/opportunities/manage');
				}
			});
		}
	}
});
// editing existing opportunities
router.get('/edit/:id', (req, res) => {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
	} else {
		let account_type = req.user.account_type;
		let account_id = req.user.account_id;
		Opportunity.findOne({ _id: req.params.id }, (err, opportunity) => {
			if (err) {
				console.log(err);
				return;
			}
			if (account_type == 2) {
				Message.find((err, messages) => {
					Admin.findOne({ '_id': account_id }, (err, admin) => {
						res.render('opportunities/edit', {
							title: 'ChanceMap | Manage Opportunities',
							account_type: account_type,
							account_id: account_id,
							currentAcc: admin,
							opportunity: opportunity,
							notis: req.notis,
							messages: messages,
						})
					})
				})
			} else {
				res.redirect('/');
			}
		});
	}
});

router.post('/edit/:id', (req, res) => {
	let data = req.body;
	let opportunity_id = req.params.id;
	let name = data.name;
	let org_name = data.org_name;
	let desc = data.desc;
	let hashtags = data.hashtags;
	let app_form = data.app_form;
	let app_deadline = data.app_deadline;
	let facebook = data.facebook;
	let website = data.website;

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
		opportunity.name = data.name;
		opportunity.desc = data.desc;
		opportunity.hashtags = data.hashtags;
		opportunity.app_form = data.app_form;
		opportunity.app_deadline = data.app_deadline;
		opportunity.start_date = data.start_date;
		opportunity.end_date = data.end_date;
		opportunity.facebook = data.facebook;
		opportunity.website = data.website;

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
