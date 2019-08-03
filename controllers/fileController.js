const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// For file uploading
const Grid = require('gridfs-stream');

// Database connection
const connection = mongoose.connection;

// Init gfs
let gfs;
connection.once('open', () => {
	// Init stream
	gfs = Grid(connection.db, mongoose.mongo);
	gfs.collection('uploads');
});

// ***** ROUTES *****
router.get('/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }

		const readstream = gfs.createReadStream(file.filename);
		readstream.pipe(res);
  });
});

// Exports
module.exports = router;
