const mongoose = require('mongoose');

// Job Schema
const jobSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	name: {type: String, required: true},
	org_id: {type: mongoose.Schema.Types.ObjectId, required: true},
	org_name: {type: String, required: true},
	desc: {type: String, required: true},
	hashtags: {type: [String], required: true},
	app_form: String,
	app_deadline: {type: Date, required: true},
	facebook: String,
	website: String,
	jobImage: {type: String}
});

// Export Job model
module.exports = mongoose.model('Job', jobSchema);