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

router.get('/', (req, res) => {
    if (req.user.account_type == 1) 
    {
        Org.find({_id: {$ne: req.user.account_id}}, (err, orgs) => {
            Org.findOne({_id: req.user.account_id}, (err, user) => {
                res.render('orgs/dashboard', {
                    title: "Code Dao | Orgs",
                    orgs: orgs,
                    currentAcc: user,
                    account_type: req.user.account_type,
                    account_id: req.user.account_id,
                    criteriaList: user.hashtags
                });
            });
        });        
    }      
    else 
    {
        User.findOne({_id: req.user.account_id}, (err, user) => {
            Org.find({}, (err, orgs) => {
                res.render('orgs/dashboard', {
                    title: "Cpde Dao | Orgs",
                    orgs: orgs,
                    currentAcc: user,
                    account_type: req.user.account_type,
                    account_id: req.user.account_id,
                    criteriaList: user.interests.concat(user.skills)
                });
            });
        });
    }
});

module.exports = router;