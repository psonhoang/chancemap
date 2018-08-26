const mongoose = require('mongoose');

// Account Schema
const notiSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	created_at: {type: Date, required: true},
	updated_at: {type: Date, required: true},
	title: {type: String, required: true},
	body: {type: String, required: true},
	image: {type: String, required: true},
	accounts: {type: [String], required: true} 
});

// Export Account model
module.exports = mongoose.model('Notification', notiSchema);