var net = require('net'),
    tls = require('tls'),
    _ = require('underscore'),
    
    conf = require('./config'),
    log = require('./log'),
    analyser = require('./analyser');

module.exports = function (clientConf) {
    var pub = {},
        client,
        channel,
        reconnectTimeout = null;

    var reconnect = function () {
        var netDriver = clientConf.ssl == 1 ? tls : net;

        client = netDriver.connect(clientConf.port, clientConf.ip, function() {
            log('client ['+ clientConf.ip +':'+ clientConf.port +']: connected', 'notice');
        })
        .on('data', function(data) {
            var strs = data.toString().split('\n');
            _.each(strs, function (s) {
                // log('[rcv] ' + s, 'debug');
                onReceivedMessage(s);
            });
        })
        .on('error', function(err) {
            log('client ['+ clientConf.ip +':'+ clientConf.port +']: ' + err, 'error');
            client.destroy();
            reconnectTimeout && clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(reconnect, clientConf.reconnect * 1000);
        })
        .on('end', function() {
            log('client ['+ clientConf.ip +':'+ clientConf.port +']: disconnected', 'warning');
            reconnectTimeout && clearTimeout(reconnectTimeout);
            setTimeout(reconnect, clientConf.reconnect * 1000);
        });
    };

    var onReceivedMessage = function (str) {
        var result = [];
        if (/\*\*\* Checking Ident/.test(str)) {
            write('NICK '+ conf.nickname);
            write('USER '+ conf.nickname +' 0 * :'+ conf.nickname);
        } else if (/End of .MOTD command/.test(str)) {
            _.each(clientConf.channels, function (c) {
                if (typeof c.password !== 'undefined') {
                    write('JOIN '+ c.channel +' '+ c.password);
                } else {
                    write('JOIN '+ c.channel);
                }
                log('Joined channel' + c.channel, 'notice');
            });
        } else if (result = /PING :(.*)/.exec(str)) {
            write('PONG :'+ result[1]);
        } else {
            result = str.match('^:(.*)!.*PRIVMSG ([^ ]+) :(.*)');
            if ( result ) {
                var name = result[1],
                    text = result[3];
                channel = /#/.test(result[2]) ? result[2] : name;

                // log('[rcv] ' + name + ': ' + text, 'debug');
                analyser(name, text, write);
            }
        }
    };

    var write = function (msg, nowrap) {
        if ( !nowrap ) {
            msg += '\r\n';
        }
        client.write(msg);
        log('[written] ' + msg.slice(0, -2), 'debug');
    }
    
    var talk = function (msg, ch) {
        if (!ch)
            ch = channel;
        write('PRIVMSG '+ ch +' :' + msg);
    }

    var tell = function (name, msg) {
        talk(name +': '+ msg);
    }

    reconnect();

    pub.write = write;
    pub.talk = talk;
    pub.tell = tell;
    return pub;
};
