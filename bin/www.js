const server = require('../app.js');

server.listen(process.env.PORT || 8080, () => {
	console.log('Server listening on port: ' + server.address().port);
});

