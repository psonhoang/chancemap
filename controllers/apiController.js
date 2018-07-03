const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const config = require('../config/database.js');
// For file uploading
const crypto = require('crypto');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');

// Models
const Account = require('../models/account');
const User = require('../models/user');
const Org = require('../models/org');
const Job = require('../models/job');
const Event = require('../models/event');

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

// *** ROUTES ***

router.get('/search', (req, res) => {
  console.log(req.query.criteriaList);
	let criteriaList = req.query.criteriaList;
	Event.find((err, events) => {
		if(err) {
			console.log(err);
			return;
		}
		events.forEach(event => {
			event.matches = 0;
			event.hashtags.forEach(hashtag => {
				criteriaList.forEach(criteria => {
					if(hashtag.includes(criteria)) {
						event.matches++;
					}
				});
			});
			if(event.matches == 0) {
				let index = events.indexOf(event);
				events.splice(index, 1);
			}
		});
		events.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
		Job.find((err, jobs) => {
			if(err) {
				console.log(err);
				return;
			}
			jobs.forEach(job => {
				job.matches = 0;
				job.hashtags.forEach(hashtag => {
					criteriaList.forEach(criteria => {
						if(hashtag.includes(criteria)) {
							job.matches++;
						}
					});
				});
				if(job.matches == 0) {
					let index = jobs.indexOf(job);
					jobs.splice(index, 1);
				}
			});
			jobs.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
			res.json({
				events: events,
				jobs: jobs,
				orgs: 'orgs',
				users: 'users'
			});
		});
	});
});

// Exports
module.exports = router;
