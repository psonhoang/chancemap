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
const JSON = require('circular-json')

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
const OrgPage = require('./models/org_page');

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
var connectedUsers = [];
var currentSocket = {};
//record of all connections
var chatSession = [];

io.on('connection', (socket) => {
  console.log('a user connected');
  console.log(chatSession);

  // For orgs
  socket.on('room', (room) => {
    console.log(room);
    socket.join(room);
  });
  // For users
  socket.on('rooms', (rooms) => {
    let noti_rooms = rooms.split(',');
    //console.log(noti_rooms);
    socket.join(noti_rooms);
  });

  //send the record of sessions to new user
  socket.emit('new connection', {chatSession});

  //join own room based on account id
  socket.on('connect self', (data) => {
    let currentSocketID = data.currentSocketID;
    socket.join(currentSocketID, () => {
      console.log(Object.keys(socket.rooms));
    });
  });

  //when this socket sends a private message
  socket.on('private message', (data) => {
    let message = data.message;
    let sender = data.sender;
    let recipient = data.recipient;
    let currentSocketID = data.currentSocketID;
    let rooms = Object.keys(socket.rooms);
    let room_id;
    chatSession.forEach(session => {
      if(session.sessionID == currentSocketID) {
        connectedUsers = session.connectedUsers.slice();
        connectedUsers.forEach(user => {
          if(user.name === recipient) {
            room_id = user.id;
          }
        });
      }
    });
    console.log(`Room ID: ${room_id}`);
    console.log(`Sender: ${sender}`);
    console.log(`Recipient: ${recipient}`);
    socket.join(room_id, () => {
      console.log(Object.keys(socket.rooms));
    });
    socket.to(room_id).emit('private message', {flag: 1, message, sender, recipient});
    socket.emit('private message', {flag: 2, message, sender, recipient});
  });

  //leave all rooms when another online user sends a message
  socket.on('leave rooms', (data) => {
    let currentSocketID = data.currentSocketID;
    let rooms = Object.keys(socket.rooms);
    rooms.forEach(room => {
      if(room != currentSocketID) {
        socket.leave(room);
      }
    });
  });

  //disconnect
  socket.on('disconnect', (data) => {
    let currentSocketID = data.currentSocketID;
    chatSession.forEach(session => {
      if(session.sessionID == currentSocketID) {
        chatSession.splice(chatSession.indexOf(session.sessionID));
      }
    });
  });

  mSocket = socket;
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
                  let temp = [];
                  let connected = users.filter(client => user.connected.indexOf(client.username) >= 0);
                  //array of chatable users
                  connected.forEach(user => {
                    let id = user.id;
                    let name = user.name;
                    if(connectedUsers.length == 0) {
                      temp.push({
                        id: id,
                        name: name,
                      })
                    } else {
                      for(let i = 0; i < connectedUsers.length; i++) {
                        if(connectedUsers[i].id != user.id) {
                          temp.push({
                            id: id,
                            name: name,
                          })
                          break;
                        }
                      }
                    }
                  })
                  connectedUsers = temp;
                  //self info
                  let id = user._id;
                  let name = user.name;
                  var client = {
                    id: id,
                    name: name,
                  };
                  currentSocket = client;
                  //array storing all users' sessions
                  let tempObject = {
                    sessionID: currentSocket.id,
                    currentSocket: currentSocket,
                    connectedUsers: connectedUsers,
                  }
                  if(chatSession.length == 0) {
                    chatSession.push(tempObject);
                  } else {
                    for(let i = 0; i < chatSession.length; i++) {
                      if(chatSession[i].sessionID != user.id) {
                        chatSession.push(tempObject);
                        break;
                      }
                    }
                  }

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

app.use((req, res, next) => {
  if(req.isUnauthenticated() && req.url != '/login') {
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
let messageRoutes = require('./controllers/messageController');
app.use('/messages', messageRoutes);

// Export
module.exports = server;
