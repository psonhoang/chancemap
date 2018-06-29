module.exports = {
	// database: 'mongodb+srv://team_codedao:' + process.env.DB_PASS +
	// '@codedaocluster-zpixx.gcp.mongodb.net/appdao?retryWrites=false',
	database: 'mongodb://team_codedao:' + process.env.DB_PASS +
	'@codedaocluster-shard-00-00-zpixx.gcp.mongodb.net:27017,codedaocluster-shard-00-01-zpixx.gcp.mongodb.net:27017,codedaocluster-shard-00-02-zpixx.gcp.mongodb.net:27017/appdao?ssl=true&replicaSet=CodeDaoCluster-shard-0&authSource=admin&retryWrites=false',
	secret: 'jwtpass',
}
