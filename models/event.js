const mongoose = require('mongoose');

// Event Schema
const eventSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	name: {type: String, required: true},
	org_id: {type: mongoose.Schema.Types.ObjectId, required: true},
	org_name: {type: String, required: true},
	desc: {type: String, required: true},
	hashtags: {type: [String], required: true},
	address: {type: String, required: true},
	reg_form: String,
	reg_deadline: Date,
	start_date: Date,
	start_time: String,
	end_date: Date,
	end_time: String,
	facebook: String,
	website: String,
	eventImage: {type: String}
});

// Export Event model
module.exports = mongoose.model('Event', eventSchema);