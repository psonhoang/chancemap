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
const Event = require('../models/event');
const User = require('../models/user');
const Job = require('../models/job');
const Org = require('../models/org');
const Admin = require('../models/admin');

// Database connection
const connection = mongoose.connection;

// Init gfs
let gfs;
connection.once('open', () => {
	// Init stream
	gfs = Grid(connection.db, mongoose.mongo);
	gfs.collection('uploads.files');
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
router.get('/', (req, res) => {
	if(!req.isAuthenticated()) {
		res.redirect('/login');
	} else {
	  let account_type = req.user.account_type;
	  let account_id = req.user.account_id;
	  let criteriaList;
	  Admin.find((err, admin) => {
	    if(err) {
	      console.log(err);
	      return;
	    }
	    if(account_type == 2) {
	      Admin.findOne({'_id': account_id}, (err, admin) => {
	        criteriaList = [];
					Job.find({'admin_id': {$ne: account_id}}, (err, jobs) => {
						Event.find({'admin_id': {$ne: account_id}}, (err, events) => {
							res.render('admin/dashboard', {
								title: 'ChanceMap | Admin',
								account_type: account_type,
								account_id: account_id,
								currentAcc: admin,
								orgs: orgs,
								jobs: jobs,
								events: events,
								criteriaList: criteriaList,
								notis: req.notis
							});
						});
	        });
	      });
			}
			else
			{
	      User.findOne({'_id': account_id}, (err, user) => {
					Job.find({}, (err, jobs) => {
						Event.find({'admin_id': {$ne: account_id}}, (err, events) => {
							res.render('admin/dashboard', {
								title: 'ChanceMap | Admin',
								account_type: account_type,
								account_id: account_id,
								currentAcc: user,
								orgs: orgs,
								jobs: jobs,
								events: events,
								criteriaList: criteriaList,
								notis: req.notis
							});
						});
					});
	      });
	    }
	  });
	}
});

router.get('/:Id', (req, res) => {
	let account_type = req.user.account_type;
	let account_id = req.user.account_id;
	let criteriaList;
	var thisUser;
	let adminId = req.params.Id;

	if (account_type == 2)
	{
		Admin.findOne({'_id': account_id}, (err, user) => {
			Admin.findOne({'_id': adminId}, (err, admin) => {
				Job.find({'admin_id': admin._id}, (err, jobs) => {
					Event.find({'admin_id': admin._id}, (err, events) => {
						res.render('admin/profile', {
							title: admin.name,
							account_type: account_type,
							account_id: account_id,
							orgs: orgs,
							jobs: jobs,
							events: events,
							criteriaList: [],
							currentAcc: user,
							notis: req.notis
						});
					});
				});
			});
		});
	}
	else
	{
		User.findOne({'_id': account_id}, (err, user) => {
			Admin.findOne({'_id': adminId}, (err, admin) => {
				Job.find({'admin_id': admin._id}, (err, jobs) => {
					Event.find({'admin_id': admin._id}, (err, events) => {
						res.render('admin/profile', {
							title: admin.name,
							account_type: account_type,
							account_id: account_id,
							orgs: orgs,
							jobs: jobs,
							events: events,
							criteriaList: user.interests.concat(user.skills),
							currentAcc: user,
							notis: req.notis
						});
					});
				});
			});
		});
	}
});

// Exports
module.exports = router;
