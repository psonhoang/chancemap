const mongoose = require('mongoose');

// User Schema
const userSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	name: {type: String, required: true},
	email: {type: String, required: true},
	username: {type: String, required: true},
	interests: {type: [String]},
	skills: {type: [String]},
	intro: String,
	school: String,
	resume_file: String, // stores resume file's link (optional)
	jobs: [mongoose.Schema.Types.ObjectId],
	facebook: String,
	website: String,
	following: [mongoose.Schema.Types.ObjectId], // contain org_ids
	avatar: String
});

// Export User model
module.exports = mongoose.model('User', userSchema);