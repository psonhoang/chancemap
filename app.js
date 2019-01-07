const compression = require('compression');
const express = require('express');
const app = express();
const config = require('./config/database.js');
//Modules
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const expressValidator = require('express-validator');
const flash = require('connect-flash');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const passport = require('passport');
// For file uploading
const crypto = require('crypto');
const multer = require('multer');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');

// Database
const mongoose = require('mongoose');
mongoose.connect(config.database, {
  useNewUrlParser: true,
  connectTimeoutMS: 120000
}).then().catch(err => {
  console.error('App starting error:', err.stack);
  process.exit(1);
});

// Models
const Admin = require('./models/admin');
const User = require('./models/user');
const Org = require('./models/org');
const Account = require('./models/account');
const Event = require('./models/event');
const Job = require('./models/job');
const Notification = require('./models/notification');
const Opportunity = require('./models/opportunity');

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
app.use(passport.authenticate('remember-me'));

// Socket.IO
const http = require('http');
const server = http.Server(app);
const socketIO = require('socket.io');
const io = socketIO(server);
var mSocket;
var mAccountType;

io.on('connection', (socket) => {
  // console.log('a user connected');

  mSocket = socket;

  // For orgs
  socket.on('room', (room) => {
    // console.log(room);
    socket.join(room);
  });

  // For users
  socket.on('rooms', (rooms) => {
    let noti_rooms = rooms.split(',');
    // console.log(noti_rooms);
    socket.join(noti_rooms);
  });

  // Disconnect
  // socket.on('disconnect', () => {
  //   console.log('a user disconected');
  // });
});

// Make io accessible to our router
app.use((req,res,next)  => {
  req.socketio = mSocket;
  next();
});

/* ***** Routes ***** */

// Get notifications numbers
app.use((req, res, next) => {
  if(req.isAuthenticated()) {
    Notification.find({'accounts': req.user.username}, (err, notis) => {
      if(err) {
        console.log(err);
        return;
      }
      req.notis = [];
      if(notis.length > 0) {
        req.notis = notis;
      }
    });
  }
  next();
});

// Home routes
app.get('/', (req, res) => {
  if(!req.isAuthenticated()) {
    res.render('splash', {title: 'ChanceMap'});
  } else {
    let account_type = req.user.account_type;
    let account_id = req.user.account_id;
    Opportunity.find((err, opportunities) => {
      if(err) {
        console.log(err);
        return;
      }
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
                  //opportunities sort
                  opportunities.forEach(opportunity => {
                    opportunity.matches = 0;
                    opportunity.hashtags.forEach(hashtag => {
                      criteriaList.forEach(criteria => {
                        if(hashtag.includes(criteria)) {
                          opportunity.matches++;
                        }
                      });
                    });
                  });
                  opportunities.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
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
                    opportunities: opportunities,
                    criteriaList: criteriaList,
                    notis: req.notis
                  });
                });
              } else if (account_type ==1 ){
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
                  // opportunities sort
                  opportunities.forEach(opportunity => {
                    opportunity.matches = 0;
                    opportunity.hashtags.forEach(hashtag => {
                      criteriaList.forEach(criteria => {
                        if(hashtag.includes(criteria)) {
                          opportunity.matches++;
                        }
                      });
                    });
                  });
                  opportunities.sort((a, b) => parseFloat(b.matches) - parseFloat(a.matches));
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
                    currentAcc: org,
                    events: events,
                    jobs: jobs,
                    orgs: orgs,
                    users: users,
                    opportunities: opportunities,
                    criteriaList: org.hashtags,
                    notis: req.notis
                  });
                });
              } else {
                Admin.findOne({'_id': account_id}, (err, admin) => {
                  let criteriaList = [];
                  res.render('index', {
                    title: 'ChanceMap | Home',
                    account_type: account_type,
                    account_id: account_id,
                    currentAcc: admin,
                    events: events,
                    jobs: jobs,
                    orgs: orgs,
                    users: users,
                    opportunities: opportunities,
                    criteriaList: criteriaList,
                    notis: req.notis
                  });
                })
              };
          });
        });
      });
    });
  });
};
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
let opportunitiesRoutes = require('./controllers/opportunityController');
app.use('/opportunities', opportunitiesRoutes)
let adminRoutes = require('./controllers/adminController');
app.use('/admin', adminRoutes);
// @File ROUTES
let fileRoutes = require('./controllers/fileController');
app.use('/files', fileRoutes);
// @API ROUTES
let searchRoutes = require('./controllers/searchController');
app.use('/search', searchRoutes);


// Export
module.exports = server;