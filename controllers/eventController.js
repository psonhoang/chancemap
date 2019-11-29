const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const config = require('../config/database.js');

const Event = require('../models/event');
const Org = require('../models/org');
const User = require('../models/user');
const Notification = require('../models/notification');
const Admin = require('../models/admin');

const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');

// Create storage engine
const storage = new GridFsStorage({
    url: config.database,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }
                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads'
                };
                resolve(fileInfo);
            });
        });
    }
});
const upload = multer({ storage });

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
        if (req.user.username != "Guest") {
			currentAcc = await Admin.findOne({ '_id': account_id});
		} else {
			currentAcc = users.filter(user => JSON.stringify(user._id) == JSON.stringify(account_id))[0];
        }
        criteriaList = [];
        connected = [];
    } else {
        currentAcc = users.filter(user => JSON.stringify(user._id) == JSON.stringify(account_id))[0];
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
        users: users,
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
        } else if (account_type == 2 && req.user.username != "Guest") {
            currentAcc = await Admin.findOne({});
            users = [];
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
    } else if (account_type == 2 && req.user.username != "Guest") {
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
router.post('/manage', upload.single(), async (req, res) => {

    let data = req.body;
    let account_id = req.user.account_id;
    let account_type = req.user.account_type;

    //delete event if status is delete
    if (data.status != "create") {
        Event.findOneAndDelete({ '_id': data.event_id }, async (err, event) => {
            console.log("Event Removed!");

            let org = await Org.findOne({ '_id': data.account_id });
            let users = await User.find();
            users = users.filter(user => user.events.indexOf(data.event_id) >= 0);
            users.forEach(user => {
                user.events.splice(user.events.indexOf(data.event_id), 1);
                user.save();
            });
            org.events.splice(org.events.indexOf(data.event_id), 1);
            org.save().then(noti => {
                let accounts = [];
                if (org.followers) {
                    accounts = org.followers;
                }
                if (accounts.length > 0) {
    
                //     let newNoti = new Notification({
                //         _id: new mongoose.Types.ObjectId(),
                //         created_at: new Date(),
                //         updated_at: new Date(),
                //         title: org.name + ' just removed their event!',
                //         body: org.name + ' removed ' + event.name,
                //         image: 'event',
                //         accounts: accounts
                //     });
    
                //     newNoti.save().then(async noti => {
                //         let users = await User.find({ 'username': { $in: accounts } });
                //         users.forEach(user => {
                //             user.new_notis.push(noti._id);
                //             user.save().then(result => {
                //             }).catch(err => {
                //                 throw (err);
                //             });
                //         });
                //         res.redirect('/events/manage');
                //     });
                
                }
                res.redirect('/events/manage');
            });  
        });
    } else {

        //otherwise, create new event
        let name = data.name;
        let org_name = data.org_name;
        let org_id = account_id;

        if (account_type == 2) {
            let targetOrg = await Org.findOne({ 'name': org_name });
            if (targetOrg != null) {
                org_id = targetOrg._id;
            } else {
                currentAcc = await Admin.findOne({ '_id': account_id });
                res.render('events/orgs/create', {
                    title: 'ChanceMap | Add a new Event (ERROR)',
                    account_type: account_type,
                    account_id: account_id,
                    currentAcc: currentAcc,
                    connected: [],
                    notis: req.notis
                });
                return;
            }
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

        newEvent.save().then(event => {

            console.log('New event created!');

            Org.findOne({ '_id': org_id }, (err, org) => {
                org.events.push(event._id);
                org.save().then(result => {
                    let accounts = [];
                    if (org.followers) {
                        accounts = org.followers;
                    }
                    // if (accounts.length > 0) {

                    //     let newNoti = new Notification({
                    //         _id: new mongoose.Types.ObjectId(),
                    //         created_at: new Date(),
                    //         updated_at: new Date(),
                    //         title: org.name + ' just added a new event!',
                    //         body: org.name + ' is hosting ' + event.name,
                    //         image: 'event',
                    //         accounts: accounts
                    //     });

                    //     newNoti.save().then(noti => {
                    //         //find users to notify
                    //         User.find({ 'username': { $in: accounts } }, (err, users) => {
                    //             users.forEach(user => {
                    //                 user.new_notis.push(noti._id);
                    //                 user.save().then(result => {
                    //                 }).catch(err => {
                    //                     res.send(err);
                    //                 });
                    //             });
                    //             res.redirect('/events/manage');
                    //         });
                    //     }).catch(err => { throw (err); });
                    // } else {
                    //     res.redirect('/events/manage');
                    // }
                });
            });
        });
        res.redirect('/events/manage');
    }
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
    } else if (account_type == 2 && req.user.username != "Guest"){
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

router.post('/edit/:id', upload.none(), (req, res) => {
    let data = req.body;
    let event_id = req.params.id;

    let name = data.name;
    let org_id = req.user.account_id;
    let org_name = data.org_name;

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

        event.save().then(async result => {
            var org;
            if (account_type == 2) {
                org = await Org.findOne({ 'name' : org_name});
            } else {
                org = await Org.findOne({ '_id': org_id });
            }
            let accounts = [];
            if (org.followers) {
                accounts = org.followers;
            }
            if (accounts.length > 0) {
                // let newNoti = new Notification({
                //     _id: new mongoose.Types.ObjectId(),
                //     created_at: new Date(),
                //     updated_at: new Date(),
                //     title: org.name + ' just edited their event!',
                //     body: org.name + ' made an edit to ' + event.name,
                //     image: 'event',
                //     accounts: accounts
                // });

                // newNoti.save((err, noti) => {
                //     if (err) {
                //         console.log(err);
                //         return;
                //     }
                //     User.find({ 'username': { $in: accounts } }, (err, users) => {
                //         users.forEach(user => {
                //             user.new_notis.push(noti._id);
                //             user.save().then(result => {
                //             }).catch(err => {
                //                 res.send(err);
                //             });
                //         });
                //         res.redirect('/events/manage');
                //     });
                // });
                res.redirect('/events/manage');
            } else {
                res.redirect('/events/manage');
            }
        }).catch(err => {
            res.send(err);
        });
    });
});

module.exports = router;