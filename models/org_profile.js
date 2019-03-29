const mongoose = require('mongoose');

// Org Profile Schema
const orgProfileSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    created_at: {type: Date},
	updated_at: {type: Date},
    org_id : {type: String, required: true},
	org_name: {type: String, required: true},
    cover_picture: {type: String}, //contain org's cover picture
    what_do_we_do: {type: String, required: true}, //contain description of org
    our_team: {type: String, required: true}, //contain description of org's team
    events_pictures: {type: String}, //contains links to pictures of org's past events
    posts_pcitures: {type: String}, //contains links to org's past posts
	new_notis: [mongoose.Schema.Types.ObjectId]
});

// Export Org model
module.exports = mongoose.model('OrgProfile', orgProfileSchema);
