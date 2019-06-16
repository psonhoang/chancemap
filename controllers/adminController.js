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
const Opportunity = require('../models/opportunity');
const Org = require('../models/org');
const Admin = require('../models/admin');
const Message = require('../models/message');

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
		Message.find((err, messages) => {
			Admin.find((err, admin) => {
		    if(err) {
		      console.log(err);
		      return;
		    } else {
		      Admin.findOne({'_id': account_id}, (err, admin) => {
		        criteriaList = [];
						Job.find({'admin_id': {$ne: account_id}}, (err, jobs) => {
							Event.find({'admin_id': {$ne: account_id}}, (err, events) => {
								Opportunity.find({'admin_id': {$ne: account_id}}, (err, opportunities) => {
									res.render('orgs/dashboard', {
										title: 'ChanceMap | Admin',
										account_type: account_type,
										account_id: account_id,
										currentAcc: admin,
										orgs: orgs,
										opportunities:opportunities,
										jobs: jobs,
										events: events,
										criteriaList: criteriaList,
										notis: req.notis,
										messages: messages,
										connected: []
									});
								});
							});
		        });
	      	});
				};
		  });
		});
	}
});

router.get('/:Id', (req, res) => {
	let account_type = req.user.account_type;
	let account_id = req.user.account_id;

	if (account_type == 2)
	{
		Message.find((err, messages) => {
			Admin.findOne({'admin_id': admin._id}, (err, user) => {
				Job.find({'admin_id': admin._id}, (err, jobs) => {
					Event.find({'admin_id': admin._id}, (err, events) => {
						Opportunity.find({'admin_id': admin._id}, (err, opportunities) => {
							res.render('org/profile', {
								title: admin.name,
								account_type: account_type,
								account_id: account_id,
								orgs: orgs,
								jobs: jobs,
								events: events,
								opportunities: opportunities,
								criteriaList: [],
								currentAcc: user,
								notis: req.notis,
								messages: messages,
								connected: []
							});
						});
					});
				});
			});
		});
	}
});

// Exports
module.exports = router;
