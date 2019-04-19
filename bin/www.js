const server = require('../app.js');

server.listen(process.env.PORT || 3000, () => {
	console.log('Server listening on port: ' + server.address().port);
});
