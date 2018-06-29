const mongoose = require('mongoose');

// Org Schema
const orgSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	created_at: {type: Date, required: true},
	updated_at: {type: Date, required: true},
	name: {type: String, required: true},
	email: {type: String, required: true},
	username: {type: String, required: true},
	hashtags: {type: [String], required: true},
	events: [mongoose.Schema.Types.ObjectId], // contain events' _ids
	jobs: [mongoose.Schema.Types.ObjectId], // contain jobs' _ids
	followers: [mongoose.Schema.Types.ObjectId], // contain users' _ids
	desc: {type: String, required: true},
	facebook: String,
	website: String,
	avatar: String
});

// Export Org model
module.exports = mongoose.model('Org', orgSchema);
