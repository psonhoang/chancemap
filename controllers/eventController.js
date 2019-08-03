const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Event = require('../models/event');
const Org = require('../models/org');
const User = require('../models/user');
const Notification = require('../models/notification');
const Admin = require('../models/admin');

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

// Events dashboard
router.get('/', async (req, res) => {

    let account_type = req.user.account_type;
    let account_id = req.user.account_id;
    let events = await Event.find();
    let users = await User.find();

    var criteriaList;
    var currentAcc;

    if (account_type == 1) {
        currentAcc = await Org.findOne({ '_id': account_id });
        criteriaList = currentAcc.hashtags;
        events = sortByHashtags(events, ['hashtags'], criteriaList);
        connected = users.filter(user => currentAcc.followers.indexOf(user.username) >= 0);
    } else if (account_type == 2) {
        currentAcc = await Admin.findOne({ '_id': account_id });
        criteriaList = [];
        connected = [];
    } else {
        currentAcc = users.filter(user => user._id == account_id)[0];
        criteriaList = currentAcc.interests.concat(currentAcc.skills);
        events = sortByHashtags(events, ['hashtags'], criteriaList);
        connected = users.filter(user => currentAcc.connected.indexOf(user.username) >= 0);
    }

    res.render('events/dashboard', {
        title: 'ChanceMap | Events',
        account_type: account_type,
        account_id: account_id,
        currentAcc: currentAcc,
        connected: connected,
        events: events,
        criteriaList: criteriaList,
        notis: req.notis
    });
});

// Viewing my own events (orgs)
router.get('/manage', async (req, res) => {

    let account_type = req.user.account_type;
    let account_id = req.user.account_id;

    var currentAcc;
    var connected;

    var events = await Event.find();

    if (account_type != 1 && account_type != 2) {
        res.redirect('/');
    } else {

        if (account_type == 1) {
            currentAcc = await Org.findOne({ '_id': account_id });
            events = events.filter(event => currentAcc.events.indexOf(event._id) >= 0);
            users = await User.find();
            connected = users.filter(user => currentAcc.followers.indexOf(user.username) >= 0);
        } else if (account_type == 2) {
            currentAcc = await Admin.findOne({});
            connected = [];
        }

        res.render('events/orgs/manage', {
            title: 'ChanceMap | My Events',
            account_type: account_type,
            account_id: account_id,
            currentAcc: currentAcc,
            events: events,
            notis: req.notis,
            users: users,
            connected: connected,
        });

    }
});

// Rendering new event creator tool
router.get('/create', async (req, res) => {

    let account_type = req.user.account_type;
    let account_id = req.user.account_id;

    var currentAcc;
    var connected;

    if (account_type != 1 && account_type != 2) {
        res.redirect('/');
    }

    if (account_type == 1) {
        currentAcc = await Org.findOne({ '_id': account_id });
        users = await User.find();
        connected = users.filter(user => currentAcc.followers.indexOf(user.username) >= 0);
    } else if (account_type == 2) {
        currentAcc = await Admin.findOne({ '_id': account_id });
        connected = [];
    }

    res.render('events/orgs/create', {
        title: 'ChanceMap | Add a new Event',
        account_type: account_type,
        account_id: account_id,
        currentAcc: currentAcc,
        connected: connected,
        notis: req.notis
    });
});

// Process creating new event/deleting past event
router.post('/manage', async (req, res) => {

    let data = req.body;

    //delete event if status is delete
    if (data.status != "create") {
        await Event.findOneAndRemove({ '_id': data.event_id });

        let org = Org.findOne({ '_id': data.account_id });

        let accounts = [];
        if (org.followers) {
            accounts = org.followers;
        }
        if (accounts.length > 0) {

            let newNoti = new Notification({
                _id: new mongoose.Types.ObjectId(),
                created_at: new Date(),
                updated_at: new Date(),
                title: org.org_name + ' just removed their event!',
                body: org.org_name + ' removed ' + event.event_name,
                image: 'event',
                accounts: accounts
            });

            newNoti.save().then(async noti => {
                let users = await User.find({ 'username': { $in: accounts } });
                users.forEach(user => {
                    user.new_notis.push(noti._id);
                    user.save().then(result => {
                        console.log(result);
                    }).catch(err => {
                        res.send(err);
                    });
                });
                req.socketio.broadcast.to(req.user.username).emit('event', noti);
                res.redirect('/events/manage');
            });
        }
        res.redirect('/events/manage');
    }

    //otherwise, create new event
    let name = data.name;
    let org_name = data.org_name;
    let org_id = req.user.account_id;

    if (req.user.account_type == 2) {
        Org.findOne({ 'name': org_name }, (err, targetOrg) => {
            org_id = targetOrg._id;
        }).catch(err => { throw (err); });
    }

    let desc = data.desc;
    let hashtags = data.hashtags;
    let address = data.address;
    let reg_form = data.reg_form;
    let reg_deadline = data.reg_deadline;
    let start_date = data.start_date;
    let end_date = data.end_date;
    let start_time = data.start_time;
    let end_time = data.end_time;
    let facebook = data.facebook;
    let website = data.website;
    let eventImage = data.eventImage;

    var newEvent = new Event({
        _id: new mongoose.Types.ObjectId(),
        created_at: new Date(),
        updated_at: new Date(),
        name: name,
        org_id: org_id,
        org_name: org_name,
        desc: desc,
        hashtags: hashtags,
        address: address,
        reg_form: reg_form,
        reg_deadline: reg_deadline,
        start_date: start_date,
        start_time: start_time,
        end_date: end_date,
        end_time: end_time,
        facebook: facebook,
        website: website,
        eventImage: eventImage
    });

    newEvent.save().then(async event => {

        console.log('New event created!');

        let org = await Org.findOne({ '_id': org_id });
        org.events.push(event._id);
        org.save().then(result => {
            let accounts = [];
            if (org.followers) {
                accounts = org.followers;
            }
            if (accounts.length > 0) {
    
                let newNoti = new Notification({
                    _id: new mongoose.Types.ObjectId(),
                    created_at: new Date(),
                    updated_at: new Date(),
                    title: org.name + ' just added a new event!',
                    body: org.name + ' is hosting ' + event.name,
                    image: 'event',
                    accounts: accounts
                });
    
                newNoti.save().then(noti => {
                    //find users to notify
                    User.find({ 'username': { $in: accounts } }, (err, users) => {
                        users.forEach(user => {
                            user.new_notis.push(noti._id);
                            user.save().then(result => {
                                console.log(result);
                            }).catch(err => {
                                res.send(err);
                            });
                        });
                        req.socketio.broadcast.to(req.user.username).emit('event', noti);
                        res.redirect('/events/manage');
                    });
                }).catch(err => { throw (err); });
            } else {
                res.redirect('/events/manage');
            }
        });
    }).catch(err => { throw (err); });
});

// Editing existing events
router.get('/edit/:id', async (req, res) => {

    let account_type = req.user.account_type;
    let account_id = req.user.account_id;
    let event = await Event.findOne({ _id: req.params.id });

    if (account_type == 1) {
        Org.findOne({ '_id': account_id }, (err, org) => {
            User.find((err, users) => {
                let currentAcc = org;
                let connected = users.filter(user => currentAcc.followers.indexOf(user.username) >= 0);
                res.render('events/orgs/edit', {
                    title: 'ChanceMap | My Events',
                    account_type: account_type,
                    account_id: account_id,
                    currentAcc: org,
                    event: event,
                    notis: req.notis
                });
            });
        });
    } else if (account_type == 2) {
        Admin.findOne({ '_id': account_id }, (err, admin) => {
            res.render('events/orgs/edit', {
                title: 'ChanceMap | Manage Events',
                account_type: account_type,
                account_id: account_id,
                currentAcc: admin,
                event: event,
                notis: req.notis
            })
        })
    } else {
        res.redirect('/');
    }
});

router.post('/edit/:id', (req, res) => {
    let data = req.body;
    let event_id = req.params.id;
    let name = data.name;
    let org_id = req.user.account_id;
    let org_name = data.org_name;
    let desc = data.desc;
    let hashtags = data.hashtags;
    let facebook = data.facebook;
    let website = data.website;
    let org_followers = data.org_followers;

    Event.findOne({ _id: event_id }, (err, event) => {
        if (err) {
            res.send('Database error...');
            console.log(err);
            return;
        }
        console.log(event);
        if (!event.created_at) {
            event.created_at = new Date();
        }
        event.updated_at = new Date();
        event.name = name;
        event.desc = desc;
        event.hashtags = hashtags;
        event.address = address;
        event.reg_form = reg_form;
        event.reg_deadline = reg_deadline;
        event.start_date = start_date;
        event.end_date = end_date;
        event.start_time = start_time;
        event.end_time = end_time;
        event.facebook = facebook;
        event.website = website;
        event.eventImage = eventImage;

        event.save().then(result => {
            console.log(result);
            Org.findOne({ '_id': org_id }, (err, org) => {
                let accounts = [];
                if (org_followers) {
                    accounts = org_followers;
                }
                if (accounts.length > 0) {
                    let newNoti = new Notification({
                        _id: new mongoose.Types.ObjectId(),
                        created_at: new Date(),
                        updated_at: new Date(),
                        title: org_name + ' just edited their event!',
                        body: org_name + ' made an edit to ' + event.name,
                        image: 'event',
                        accounts: accounts
                    });

                    newNoti.save((err, noti) => {
                        if (err) {
                            console.log(err);
                            return;
                        }
                        console.log(noti);
                        User.find({ 'username': { $in: accounts } }, (err, users) => {
                            users.forEach(user => {
                                user.new_notis.push(noti._id);
                                user.save().then(result => {
                                    console.log(result);
                                }).catch(err => {
                                    res.send(err);
                                });
                            });
                            req.socketio.broadcast.to(req.user.username).emit('event', noti);
                            res.redirect('/events/manage');
                        });
                    });
                } else {
                    res.redirect('/events/manage');
                }
            });
        }).catch(err => {
            res.send(err);
        });
    });
});

module.exports = router;