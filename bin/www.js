const app = require('../app.js');

let server = app.listen(process.env.PORT || 3030, () => {
	console.log('Server listening on port: ' + server.address().port);
});