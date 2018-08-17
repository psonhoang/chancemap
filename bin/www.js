const app = require('../app.js');

let server = app.listen(process.env.PORT || 8080, () => {
	console.log('Server listening on port: ' + server.address().port);
});