var _ = require('underscore'),

	conf = require('./lib/config'),
	cmdServer = require('./lib/cmdServer'),
	ircConnector = require('./lib/ircConnector');

_.each(conf.clients, function (clientConf, i) {
	var connection = ircConnector(clientConf);
	cmdServer.add(clientConf, connection);
});
cmdServer.start();