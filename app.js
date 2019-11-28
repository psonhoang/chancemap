const express = require('express');
const app = express();
const config = require('./config/database.js');

//Modules
const compression = require('compression');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const expressValidator = require('express-validator');
const flash = require('connect-flash');
const session = require('express-session');

// const bcrypt = require('bcryptjs');
const passport = require('passport');

// For file uploading
// const crypto = require('crypto');
// const multer = require('multer');
// const Grid = require('gridfs-stream');
const methodOverride = require('method-override');

// Models
const Admin = require('./models/admin');
const User = require('./models/user');
const Org = require('./models/org');
const Event = require('./models/event');
const Job = require('./models/job');
const Notification = require('./models/notification');
const Opportunity = require('./models/opportunity');

//Utility Functions
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

// Public static
app.use(express.static(path.join(__dirname, 'public'))); // Static files root directory
// app.use(express.static('uploads')); // Upload files root directory

// View engine
app.set('view engine', 'ejs');
app.set('views', [path.join(__dirname, 'views'),
                  path.join(__dirname, 'views/pages'),
                  path.join(__dirname, 'views/partials'),
                  path.join(__dirname, 'views/defaultLayouts')]);
app.engine('ejs', require('express-ejs-extend'));

// gzip compression
app.use(compression());

// Method Override
app.use(methodOverride('_method'));

// Body-parser
app.use(bodyParser.json()); // Parse json data for web forms
app.use(bodyParser.urlencoded({
  extended: true
}));

// Cookie-parser
app.use(cookieParser());

// Express Session Middleware
app.use(session({
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: true
}));

app.use(flash());

// Express Messages Middleware
// app.use(function (req, res, next) {
//   res.locals.messages = require('express-messages')(req, res);
//   next();
// });

// Express Validator Middleware
app.use(expressValidator({
  errorFormatter: function (param, msg, value) {
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
app.use(passport.authenticate('remember-me'));

// Server
const http = require('http');
const server = http.Server(app);

// Database
const mongoose = require('mongoose');
mongoose.connect(config.database, {
  useNewUrlParser: true,
  connectTimeoutMS: 120000
}).then().catch(err => {
  console.error('App starting error:', err.stack);
  process.exit(1);
});

// Home routes
app.get('/', async (req, res) => {

  if (!req.isAuthenticated()) {
    res.render('splash', { title: 'ChanceMap' });
  } else {

    let account_type = req.user.account_type;
    let account_id = req.user.account_id;

    var connected;
    var criteriaList;

    let opportunities = await Opportunity.find();
    let events = await Event.find();
    let jobs = await Job.find();
    let orgs = await Org.find();
    let users = await User.find();

    //find appropriate account, set the right criterial list and connected list
    if (account_type == 0) {
      var user = users.filter(user => user._id == account_id)[0];
      currentAcc = user;
      connected = users.filter(client => user.connected.indexOf(client.username) >= 0);
      criteriaList = user.interests.concat(user.skills);
    }
    else if (account_type == 1) {
      var org = await Org.findOne({ '_id': account_id });
      currentAcc = org;
      connected = users.filter(user => org.followers.indexOf(user.username) >= 0);
      criteriaList = org.hashtags;
    }
    else {
      if (req.user.username == 'Guest') {
        currentAcc = users.filter(user => JSON.stringify(user._id) == JSON.stringify(account_id))[0];
        connected =[];
        criteriaList = [];
      } else {
        var admin = await Admin.findOne({ '_id': account_id });
        currentAcc = admin;
        connected = [];
        criteriaList = [];
      }
    }

    // sort by hashtags
    orgs = sortByHashtags(orgs, ['hashtags'], criteriaList);
    events = sortByHashtags(events, ['hashtags'], criteriaList);
    opportunities = sortByHashtags(opportunities, ['hashtags'], criteriaList);
    jobs = sortByHashtags(jobs, ['hashtags'], criteriaList);
    users = sortByHashtags(users, ['interests', 'skills'], criteriaList);

    // render page
    res.render('index', {
      title: 'ChanceMap | Home',
      account_type: account_type,
      account_id: account_id,
      currentAcc: currentAcc,
      events: events,
      jobs: jobs,
      orgs: orgs,
      users: users,
      opportunities: opportunities,
      criteriaList: criteriaList,
      notis: req.notis,
      connected: connected,
    });
  }
});

/* ***** Routes ***** */

// Get notifications numbers
app.use((req, res, next) => {
  if (req.isAuthenticated()) {
    Notification.find({ 'accounts': req.user.username }, (err, notis) => {
      if (err) {
        console.log(err);
        return;
      }
      req.notis = [];
      if (notis.length > 0) {
        req.notis = notis;
      }
    });
  }
  next();
});

// Route controllers
app.use((req, res, next) => {
  var acceptedURLs = ['/login', '/register', '/register/org', '/register/user'];
  if (req.isUnauthenticated() && acceptedURLs.indexOf(req.url) < 0) {
    res.redirect('/login');
  } else {
    next();
  }
});

// @Account ROUTES
let accRoutes = require('./controllers/accountController');
app.use('/', accRoutes);
// @Event ROUTES
let eventRoutes = require('./controllers/eventController');
app.use('/events', eventRoutes);
// @Job ROUTES
let jobRoutes = require('./controllers/jobController');
app.use('/jobs', jobRoutes);
// @User ROUTES
let userRoutes = require('./controllers/userController');
app.use('/users', userRoutes);
// @Org ROUTES
let orgRoutes = require('./controllers/orgController');
app.use('/orgs', orgRoutes);
// @Opportunity ROUTES
let opportunitiesRoutes = require('./controllers/opportunityController');
app.use('/opportunities', opportunitiesRoutes)
// @Admin ROUTES
let adminRoutes = require('./controllers/adminController');
app.use('/admin', adminRoutes);
// @File ROUTES
let fileRoutes = require('./controllers/fileController');
app.use('/files', fileRoutes);
// @Search ROUTES
let searchRoutes = require('./controllers/searchController');
app.use('/search', searchRoutes);
// @Calendar ROUTES
let calendarRoutes = require('./controllers/calendarController');
app.use('/calendar', calendarRoutes);

// Export
module.exports = server;
