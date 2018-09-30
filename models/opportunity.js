const mongoose = require('mongoose');

// Opportunity Schema
const opportunitySchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	created_at: {type: Date, required: true},
	updated_at: {type: Date, required: true},
	name: {type: String, required: true},
	org_name: {type: String, required: true},
	desc: {type: String, required: true},
	app_form: String,
	app_deadline: {type: Date, required: true},
	start_date: {type: Date, required: true},
	end_date: {type: Date, required: true},
	facebook: String,
	website: String
});

// Export Opportunity model
module.exports = mongoose.model('Opportunity', opportunitySchema);
