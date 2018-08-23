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
const Grid = require('gridfs-stream');

// Database
const mongoose = require('mongoose');
mongoose.connect(config.database, {
  connectTimeoutMS: 120000
}).then().catch(err => {
  console.error('App starting error:', err.stack);
  process.exit(1);
});
const connection = mongoose.connection;

// Models
const User = require('./models/user');
const Org = require('./models/org');
const Account = require('./models/account');
const Event = require('./models/event');
const Job = require('./models/job');

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
app.use(flash());
// app.use(function (req, res, next) {
//   res.locals.messages = require('express-messages')(req, res);
//   next();
// });

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

// Socket.IO
const http = require('http');
const server = http.Server(app);
const socketIO = require('socket.io');
const io = socketIO(server);

io.on('connection', (socket) => {
  console.log('a user connected');
  
  socket.on('echo', (msg) => {
    console.log(msg);
  });

  socket.on('testing', (msg) => {
    console.log(msg);
  });

  socket.on('disconnect', () => {
    console.log('a user disconected');
  });
});

// Make io accessible to our router
app.use((req,res,next) => {
    req.io = io;
    next();
});

/* ***** Routes ***** */

// Home routes
app.get('/', (req, res) => {
  if(!req.isAuthenticated()) {
    res.redirect('/login');
  } else {
    // res.send('Hi there, ' + req.user.username + '; Your account type is: ' + req.user.account_type);
    let account_type = req.user.account_type;
    let account_id = req.user.account_id;
    Event.find((err, events) => {
      if(err) {
        console.log(err);
        return;
      }
      Job.find((err, jobs) => {
        if(err) {
          console.log(err);
          return;
        }
        Org.find((err, orgs) => {
          if(err) {
            console.log(err);
            return;
          }
          User.find((err, users) => {
            if(err) {
              console.log(err);
              return;
            }
            if(account_type == 0) {
              User.findOne({'_id': account_id}, (err, user) => {
                // res.send(user);
                let criteriaList = user.interests.concat(user.skills);
                // orgs sort
                orgs.forEach(org => {
                  org.matches = 0;
                  org.hashtags.forEach(hashtag => {
                    criteriaList.forEach(criteria => {
                      if(hashtag.includes(criteria)) {
                        org.matches++;
                      }
                    });
                  });
                });
                orgs.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
                // events sort
                events.forEach(event => {
                  event.matches = 0;
                  event.hashtags.forEach(hashtag => {
                    criteriaList.forEach(criteria => {
                      if(hashtag.includes(criteria)) {
                        event.matches++;
                      }
                    });
                  });
                });
                events.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
                // jobs sort
                jobs.forEach(job => {
                  job.matches = 0;
                  job.hashtags.forEach(hashtag => {
                    criteriaList.forEach(criteria => {
                      if(hashtag.includes(criteria)) {
                        job.matches++;
                      }
                    });
                  });
                });
                jobs.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
                // users sort
                users.forEach(user => {
                  user.matches = 0;
                  let userHashtags = user.interests.concat(user.skills);
                  userHashtags.forEach(hashtag => {
                    criteriaList.forEach(criteria => {
                      if(hashtag.includes(criteria)) {
                        user.matches++;
                      }
                    });
                  });
                });
                users.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
                res.render('index', {
                  title: 'ChanceMap | Home',
                  account_type: account_type,
                  account_id: account_id,
                  currentAcc: user,
                  events: events,
                  jobs: jobs,
                  orgs: orgs,
                  users: users,
                  criteriaList: criteriaList
                });
              });
            } else {
              Org.findOne({'_id': account_id}, (err, org) => {
                let criteriaList = org.hashtags;
                // orgs sort
                orgs.forEach(org => {
                  org.matches = 0;
                  org.hashtags.forEach(hashtag => {
                    criteriaList.forEach(criteria => {
                      if(hashtag.includes(criteria)) {
                        org.matches++;
                      }
                    });
                  });
                });
                orgs.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
                // events sort
                events.forEach(event => {
                  event.matches = 0;
                  event.hashtags.forEach(hashtag => {
                    criteriaList.forEach(criteria => {
                      if(hashtag.includes(criteria)) {
                        event.matches++;
                      }
                    });
                  });
                });
                events.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
                // jobs sort
                jobs.forEach(job => {
                  job.matches = 0;
                  job.hashtags.forEach(hashtag => {
                    criteriaList.forEach(criteria => {
                      if(hashtag.includes(criteria)) {
                        job.matches++;
                      }
                    });
                  });
                });
                jobs.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
                // users sort
                users.forEach(user => {
                  user.matches = 0;
                  let userHashtags = user.interests.concat(user.skills);
                  userHashtags.forEach(hashtag => {
                    criteriaList.forEach(criteria => {
                      if(hashtag.includes(criteria)) {
                        user.matches++;
                      }
                    });
                  });
                });
                users.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
                res.render('index', {
                  title: 'ChanceMap | Take Home',
                  account_type: account_type,
                  account_id: account_id,
                  currentAcc: org,
                  events: events,
                  jobs: jobs,
                  orgs: orgs,
                  users: users,
                  criteriaList: org.hashtags
                });
              });
            }
          });
        });
      });
    });
  }
});


// Route controllers
let accRoutes = require('./controllers/accountController');
app.use('/', accRoutes);
let eventRoutes = require('./controllers/eventController');
app.use('/events', eventRoutes);
let jobRoutes = require('./controllers/jobController');
app.use('/jobs', jobRoutes);
let userRoutes = require('./controllers/userController');
app.use('/users', userRoutes);
let orgRoutes = require('./controllers/orgController');
app.use('/orgs', orgRoutes);
// @File ROUTES
let fileRoutes = require('./controllers/fileController');
app.use('/files', fileRoutes);
// @API ROUTES
let searchRoutes = require('./controllers/searchController');
app.use('/search', searchRoutes);
// Export
module.exports = server;
