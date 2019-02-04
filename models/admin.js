const mongoose = require('mongoose');
// 	Admin Schema
const adminSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	created_at: {type: Date, required: true},
	updated_at: {type: Date, required: true},
	name: {type: String, required: true},
	email: {type: String, required: true},
	username: {type: String, required: true},
	events: [mongoose.Schema.Types.ObjectId], // contain events' _ids
	jobs: [mongoose.Schema.Types.ObjectId], // contain jobs' _ids
  	opportunities: [mongoose.Schema.Types.ObjectId],
	desc: {type: String, required: true},
	facebook: String,
	avatar: String,
	new_notis: [mongoose.Schema.Types.ObjectId]
});

// Export Admin model
module.exports = mongoose.model('Admin', adminSchema);
