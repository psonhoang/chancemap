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
// For file uploading
const crypto = require('crypto');
const multer = require('multer');
// const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
// const methodOverride  = require('method-override');

// Database
const mongoose = require('mongoose');
mongoose.connect(config.database);
const connection = mongoose.connection;

// Models
const User = require('./models/user');
const Org = require('./models/org');
const Account = require('./models/account');

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

// method-override
// app.use(methodOverride('_method'));

// Init gfs
let gfs;
connection.once('open', () => {
	// Init stream
	gfs = Grid(connection.db, mongoose.mongo);
	gfs.collection('uploads');
});

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
        gfs.files.findOne({filename: org.avatar}, (err, file) => {
          // Check if file
          let hasAvatar = true;
          if (!file || file.length === 0) {
            hasAvatar = false;
          }
          // File exists
          res.render('index', {
            title: 'App Dao | Dashboard',
            account_type: account_type,
            account_id: account_id,
            currentAcc: org,
            hasAvatar: hasAvatar
          });
        });
      });
    }
  }
});

// Route controllers
let accRoutes = require('./controllers/accountController');
app.use('/', accRoutes);
// @File ROUTES
let fileRoutes = require('./controllers/fileController');
app.use('/files', fileRoutes);
//event routes
let eventRoutes = require('./controllers/eventController');
app.use('/', eventRoutes);

// Export
module.exports = app;
