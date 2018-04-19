
const PlayerPool = require('./players');
const MSG = require('../static/js/msgType');
const WS = require('ws');
const BlockChanges = require('./blockChanges')
const fs = require('fs');
const nanoid = require('nanoid');

function saveLatencyStack(player){
    var str = JSON.stringify(player.latency);

    //write latency to file
    fs.writeFile(`./latencyReps/${player.name}-${player.id}.json`, JSON.stringify(player.latency), function(err) {
        if(err) {
            return console.log(err);
        }

        console.log(`${player.name}:Latency file saved`);
    });


    player.id = nanoid();
    player.latency = [];
}


// constructor
function Server(httpServer){
    this.httpServer = httpServer;
    this.wsServer = null;

    // contains the players pool
    this.players = new PlayerPool();

    // generic information about the game world
    this.worldInfo = {
        seed: 4,
        spawn: {
            x:5,
            y:20,
            z:5,
        }
    };
    this.blockChanges = new BlockChanges();

    this.initWsServer();
}

// ==================================================== WSSERVER EVENT HANDLERS
Server.prototype.handlers = {
    // handles incoming verification requests
    // returns true if the connection should be allowed
    onVerification: function(e){
        console.log('connecting client(origin:',e.origin,')');
        return true;
    },
    // handles incoming connections
    // binds events to the connection
    onConnection: function(ws,req){
        //TODO: avoid using bind in addEventListener as it may cause memory leaks!
        ws.onmessage = this.handlers.onNonPlayerMessage.bind(this);
        console.log('connection established');
    },
    // handles messages received
    // from unregistered connections
    onNonPlayerMessage: function(e){
        // check the payload of the message is valid
        var payload = MSG.validate(e.data);
        if(payload === false) return;
        // keep a shortcut to the sending client
        var ws = e.target;

        //console.log('NonPlayer:',payload);
        switch (payload.type) {
            case MSG.TYPE.REQUEST_JOIN:
                // client wants to join the game
                this.players.addPlayer(payload.data.playerName, ws);
                // the player is now registered
                // switch the onmessage handler
                // and listen for when the player disconnects
                //TODO: avoid using bind in addEventListener as it may cause memory leaks!
                ws.onmessage = this.handlers.onPlayerMessage.bind(this);
                ws.onclose = this.handlers.onPlayerDisconnect.bind(this);


                // TESTING
                var player = this.players.findBySocket(ws);

                //pong latency function
                ws.on('pong',function(){
                    const diff = process.hrtime(player.pingSent);
                    const ms = diff[0] * 1000 + diff[1] * 1e-6;

                    console.log(`${player.name}:ping ${player.latency.length}: ${diff[1]}ns (${ms}ms)`);
                    player.latency.push(ms);

                    if(player.latency.length == 300){
                        ws.send(JSON.stringify({
                            type: MSG.TYPE.LATENCY_REPORT,
                            data: player.latency
                        }));
                        //saveLatencyStack(player);
                    }
                });

                player.pingInterval = setInterval(function(){
                    player.pingSent = process.hrtime();
                    ws.ping('pingdatapingdatapingdata');
                },500)

                // send the player information needed to construct the world
                var str = JSON.stringify({
                    type: MSG.TYPE.INFO_WORLD,
                    data: this.worldInfo,
                });
                ws.send(str);
                break;
            default:
                break;
        }
    },
    onPlayerMessage: function(e){
        // check the payload of the message is valid
        var payload = MSG.validate(e.data);
        if(payload === false) return;
        // keep a shortcut to the sending client, type and data
        var ws = e.target;
        var type = payload.type;
        var data = payload.data;

        console.log(`${this.players.findBySocket(ws).name}:`, payload);

        switch (type) {
            case MSG.TYPE.LATENCY_REPORT:
                var player = this.players.findBySocket(ws);
                ws.send(JSON.stringify({
                    type: MSG.TYPE.LATENCY_REPORT,
                    data: player.latency
                }));
                break;
            case MSG.TYPE.PLAYER_CHAT_SENT:
                var player = this.players.findBySocket(ws);
                this.players.broadcast(MSG.TYPE.PLAYER_CHAT_SENT, {text:player.name + ": " + data.text});
                break
            case MSG.TYPE.PLAYER_MOVED:
                // a player has changed his position
                var player = this.players.findBySocket(ws)
                player.setPosition(data);
                // tell nearby players about the change
                this.players.broadcastWithinRange(
                    player,
                    2,
                    MSG.TYPE.INFO_PLAYER_UPDATE,
                    {
                        'playerName': player.name,
                        'x':data.x,
                        'y':data.y,
                        'z':data.z
                    }
                );
                break;
            case MSG.TYPE.REQUEST_BLOCK_PLACE:
            case MSG.TYPE.REQUEST_BLOCK_DESTROY:
                // a player has placed
                // or destroyed a block within the world

                // ensure bedrock is not broken
                if(data.y < 1) break;

                var player = this.players.findBySocket(ws);
                this.blockChanges.addChange(data.x,data.y,data.z,data.t || 0);
                console.log(this.blockChanges);
                // forward the message
                // in 1 chunk radius
                this.players.broadcastWithinRange(
                    player,
                    1,
                    MSG.TYPE.INFO_BLOCK_CHANGED,
                    data
                )
                this.rangedBroadcast(data.x, data.z, 1, MSG.TYPE.INFO_BLOCK_CHANGED, data);
                break;
            case MSG.TYPE.REQUEST_CHUNK_INFO:
                var info = this.blockChanges.getChangesGrid9(data.x,data.z);
                var str = JSON.stringify({
                    type: MSG.TYPE.INFO_CHUNKS,
                    data: {
                        origin: {
                            x: data.x,
                            z: data.z
                        },
                        changes: info
                    },
                });
                ws.send(str);

                break
            default:
                break;
        }

    },
    // handles disconnect events
    onPlayerDisconnect: function(e){
        this.players.removePlayer(e.target);
    },
}
Server.prototype.rangedBroadcast = function(x,z,r,type,data){
    var cx = Math.floor(x/16);
    var cz = Math.floor(z/16);
    this.players.filter
}
Server.prototype.initWsServer = function(){
    this.wsServer = new WS.Server({
        server: this.httpServer,
        verifyClient: this.handlers.onVerification,
    });
    this.wsServer.on('connection',this.handlers.onConnection.bind(this));
}

module.exports = Server;
