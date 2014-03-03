var conf = require('./config.js'),
    servers = [];

exports.add = function (clientConf, ircConnection) {
    servers.push({
        conf: clientConf,
        connection: ircConnection
    });
};

exports.start = function () {
    if (conf.server.cmd.enable) {
        startServer(conf.server.cmd.port, conf.server.cmd.listen);
    } else {
        servers = null;
    }
};

var startServer = function (port, host) {
    var net = require('net');
    net.createServer(function(socket) {
        var nowServer = servers[0],
            channels = function () { 
                return nowServer.conf.channels.reduce(function (a,b) { return a.channel + ',' + b.channel}) 
            },
            channel = channels()[0],
            client = nowServer.connection,
            write = function (msg) {
                socket.write(msg + '\r\n');
            },
            help = function () {
                write('\t/sv {servername} \t\t change server');
                write('\t/ch {#channel_name} \t\t change channel');
                write('\t/help \t\t\t\t show help document');
                write('\t/{any_irc_command} \t\t do any irc command, ex: JOIN, NICK, ...');
                write('\t/exit \t\t\t\t leave');
                write('==========================');
                write('Connected servers:');
                _.each(servers, function (server, i) {
                    write('['+ i +'] ' + server.conf.ip + ':' + server.conf.port);
                });
                write('Joined channels: ' + channels().join(','));
                write("you're in " + nowServer.conf.ip + "'s " + channel);
            },
            tmp = [];

        socket.on('data', function (cmd) {
            if ( cmd.length > 0 ) {
                if ( /^\/help/.test(cmd) ) {
                    help();
                } else if ( tmp = /^\/sv (.+)/.exec(cmd) ) {
                    var serverIndex = tmp[1];
                    if (servers[serverIndex] !== undefined) {
                        nowServer = servers[serverIndex];
                    } else {
                        write('unknown server.');
                    }
                } else if ( tmp = /^\/ch (#.+)/.exec(cmd) ) {
                    if (channels().indexOf(tmp[1]) != -1)
                        channel = tmp[1];
                    else
                        write('unknown channel.');
                } else if ( /^\/exit/.test(cmd) ) {
                    socket.destroy();
                } else if ( /^\//.test(cmd) ) {
                    client.write(cmd.slice(1));
                } else {
                    client.talk(cmd, channel);
                }
            }
        });

        write('=== Welcome to IRCBot.js ===');
        help();
    })
    .listen(port, host || '0.0.0.0');
};