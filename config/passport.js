const LocalStrategy = require('passport-local').Strategy;
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
    query = {username:username};
    if (validateEmail(username)) {
      var query = {email: username};
    } else {
      var query = {username: username};
    }
    // Match username
    Account.findOne(query, (err, account) => {
      if (err) throw err;
      if(!account) {
        return done(null, false, {message: 'No account found with username: '+ username});
      }

    // Match password
      bcrypt.compare(password, account.password, (err, isMatch) => {
        if(err) throw err;
          if(isMatch) {
            console.log("Matched pass!");
            return done(null, account);
          } else {
            console.log("Wrong pass!");
            return done(null, false, {message: 'Wrong password for ' + username});
          }
        });
      });
    }));

  passport.serializeUser(function(account, done) {
    done(null, account.id);
  });

  passport.deserializeUser(function(id, done) {
    Account.findById(id, function(err, account) {
      done(err, account);
    });
  });
};
