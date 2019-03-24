const express = require('express');
const router = express.Router();

const Admin = require('../models/admin');
const User = require('../models/user');
const Org = require('../models/org');

// @Routes
// @GET '/calendar'
router.get('/', (req, res) => {
    let account_type = req.user.account_type;
    let account_id = req.user.account_id;
    if(account_type == 0 ) {
        User.findOne({'_id': account_id}, (err, user) => {
            res.render('calendar', {
                title: "ChanceMap | Calendar",
                account_type: req.user.account_type,
                account_id: req.user.account_id,
                currentAcc: user,
                notis: req.notis
            });
        });
    } else if(account_type == 1) {
        Org.findOne({'_id': account_id}, (err, org) => {
            res.render('calendar', {
                title: "ChanceMap | Calendar",
                account_type: req.user.account_type,
                account_id: req.user.account_id,
                currentAcc: org,
                notis: req.notis
            });
        });
    } else {
        Admin.findOne({'_id': account_id}, (err, admin) => {
            res.render('calendar', {
                title: "ChanceMap | Calendar",
                account_type: req.user.account_type,
                account_id: req.user.account_id,
                currentAcc: admin,
                notis: req.notis
            });
        });
    }
});

module.exports = router;