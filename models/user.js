const mongoose = require('mongoose');

// User Schema
const userSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	created_at: {type: Date, required: true},
	updated_at: {type: Date, required: true},
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
	following: [String], // contain org's usernames
	connected: [String],
	connect_sent: [String],
	connect_received: [String],
	avatar: String,
	new_notis: [mongoose.Schema.Types.ObjectId],
	messages: [mongoose.Schema.Types.ObjectId],
	// unread_messages: Number,
	msg_noti: Number,
});

// Export User model
module.exports = mongoose.model('User', userSchema);
