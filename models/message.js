const mongoose = require('mongoose');

// Account Schema
const messageSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
  creator: mongoose.Schema.Types.ObjectId,
  sender: {type: String, required: true},
  recipient: {type: String, required: true},
	created_at: {type: Date, required: true},
	message: {type: String, required: true},
});

// Export Account model
module.exports = mongoose.model('Message', messageSchema);
