const mongoose = require('mongoose');

// Org Profile Schema
const orgProfileSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    created_at: {type: Date},
	updated_at: {type: Date},
    org_id : {type: String, required: true},
	org_name: {type: String, required: true},
    what_we_do: {type: String, required: true}, //contain description of org
    our_team: {type: String, required: true}, //contain description of org's team
});

// Export Org model
module.exports = mongoose.model('OrgProfile', orgProfileSchema);
