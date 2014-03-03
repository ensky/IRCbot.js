require('./date');
var _ = require('underscore'),
    conf = require('./config'),
    intLevel = function (level) {
    	var levels = ['debug', 'notice', 'warning', 'error'];
    	return _.indexOf(levels, level);
    };

// debug, notice, warning, error
module.exports = function (text, type) {
	if (!type) 
		type = 'debug';
	if (intLevel(type) >= intLevel(conf.debug_level)) {
		var now = new Date();
		console.log( now.format("isoDateTime") + ' ['+ type +'] ' + text );
	}
};
