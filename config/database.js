let password = process.env.DB_PASS || 'jwtpass';

module.exports = {
	database: 'mongodb+srv://team_codedao:' + password + '@chancemapfree-zpixx.mongodb.net/chancemapvn?retryWrites=true'
}
