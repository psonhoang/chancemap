const mongoose = require('mongoose');

// Account Schema
const accountSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	email: {type: String, required: true},
	username: {type: String, required: true},
	password: {type: String, required: true},
	account_type: Number, // 0: User account; 1: Org account
	account_id: mongoose.Schema.Types.ObjectId // store either user or org account's _id
});

// Export Account model
module.exports = mongoose.model('Account', accountSchema);
