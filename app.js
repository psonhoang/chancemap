const express = require('express');
const app = express();
const config = require('./config/database.js');
//Modules
const path = require('path');
const bodyParser = require('body-parser');
const expressValidator = require('express-validator');
const flash = require('connect-flash');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const passport = require('passport');

// Database
const mongoose = require('mongoose');
mongoose.connect(config.database);

// Models
const User = require('./models/user');
const Org = require('./models/org');

// View engine
app.set('view engine', 'ejs');
app.set('views', [path.join(__dirname, 'views'),
                  path.join(__dirname, 'views/pages'),
                  path.join(__dirname, 'views/partials'),
                  path.join(__dirname, 'views/defaultLayouts')]);
app.engine('ejs', require('express-ejs-extend'));

// Body-parser
app.use(bodyParser.json()); // Parse json data for web forms
app.use(bodyParser.urlencoded({
  extended: true
}));

// Public static
app.use(express.static(path.join(__dirname, 'public'))); // Static files root directory
// app.use(express.static('uploads')); // Upload files root directory

// Express Session Middleware
app.use(session({
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: true
}));

// Express Messages Middleware
app.use(require('connect-flash')());
app.use(function (req, res, next) {
  res.locals.messages = require('express-messages')(req, res);
  next();
});

// Express Validator Middleware
app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
    var namespace = param.split('.'),
      root = namespace.shift(),
      formParam = root;

    while (namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param: formParam,
      msg: msg,
      value: value
    };
  }
}));

// Passport config
require('./config/passport')(passport);
// Passsport Middleware
app.use(passport.initialize());
app.use(passport.session());

// ***** Routes *****

// Home routes
app.get('/', (req, res) => {
  if(!req.isAuthenticated()) {
    res.redirect('/login');
  } else {
    // res.send('Hi there, ' + req.user.username + '; Your account type is: ' + req.user.account_type);
    let account_type = req.user.account_type;
    let account_id = req.user.account_id;
    if(account_type == 0) {
      User.findOne({'_id': account_id}, (err, user) => {
        // res.send(user);
        res.render('index', {
          title: 'App Dao | Dashboard',
          account_type: account_type,
          account_id: account_id,
          currentAcc: user
        });
      });
    } else {
      Org.findOne({'_id': account_id}, (err, org) => {
        // res.send(org);
        res.render('index', {
          title: 'App Dao | Dashboard',
          account_type: account_type,
          account_id: account_id,
          currentAcc: org
        });
      });
    }
  }
});

// Route controllers
let accRoutes = require('./controllers/accountController');
app.use('/', accRoutes);



// Export
module.exports = app;
