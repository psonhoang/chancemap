const express = require('express');
const router = express.Router();

// @Routes

// @MIDDLEWARE Authentication check
router.use((req, res, next) => {
    if(!req.isAuthenticated) {
        res.redirect('/login');
    }
    next();
});

// @GET /calendar
router.get('/', (req, res) => {
    res.render('calendar', {
        title: "ChanceMap | Calendar",
        account_type: req.user.account_type,
        account_id: req.user.account_id,
        currentAcc: admin,
        notis: req.notis
    });
});

module.exports = router;