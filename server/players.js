/*
*   An array of players with supporting functions
*/

// nanoid provides an unique ids to all players
const nanoid = require('nanoid');
const MSG = require('../static/js/msgType');

// single player class
function Player(id, name, socket){
    this.id = id;
    this.socket = socket;
    this.name = name;
    this.position = null;
}
Player.prototype.setPosition = function(pos){
    this.position = pos;
}
Player.prototype.getChunk = function(){
    if(typeof(this.position) !== 'object') return null;
    return {
        cx: Math.floor(this.position.x / 16),
        cz: Math.floor(this.position.z / 16)
    }
}
// returns the player's 'distance' to the given chunk
Player.prototype.distanceToChunk = function(chunk){
    var thisChunk = this.getChunk();
    return Math.max(
        Math.abs(thisChunk.cx - chunk.cx),
        Math.abs(thisChunk.cz - chunk.cz)
    );
}

// contains the player pool and related methods
function PlayerPool(){
    this._players = [];
}

// finds the player with the corresponding socket
PlayerPool.prototype.findBySocket = function(ws){
    return this._players.find((player) => player.socket === ws);
    //return this._players[this._players.findIndex((player) => player.socket === ws)];
    // for(key in this._players){
    //     if(this._players[key].socket === ws) return this._players[key];
    // }
    //return null;
}
// finds all players in 'radius' of x chunks from this player
PlayerPool.prototype.findInRange = function(player,range){
    var c1 = player.getChunk();
    return this._players.filter(function(player2){
        return player.distanceToChunk(player2.getChunk()) <= range;
    });
}
// adds a player to the player pool
PlayerPool.prototype.addPlayer = function(name, ws){
    // generate an id for the new player
    var id = nanoid();
    // register the player in the player pool
    this._players.push(new Player(id,name,ws));
    //broadcast a message
    this.broadcast(MSG.TYPE.INFO_PLAYER_JOINED,{
        'playerName': name,
    });
}
PlayerPool.prototype.removePlayer = function(ws){
    // check if the player is actually connected
    var index = this._players.findIndex((player) => player.socket === ws);
    if(index < 0) return false;

    // get the player's name before removing
    var name = this._players[index].name;
    // remove the player by shifting the Array
    // (for better speed)
    this._players[index] = this._players[this._players.length - 1];
    this._players.pop();
    // broadcast a message
    this.broadcast(MSG.TYPE.INFO_PLAYER_LEFT,{
        'playerName': name,
    });
    return true;
}
// sends a message to all players
PlayerPool.prototype.broadcast = function(type,data){
    var str = JSON.stringify({
        'type': type,
        'data': data
    });
    this._players.forEach((player) => player.socket.send(str));
}

// sends a message to all players in range of given player
PlayerPool.prototype.broadcastWithinRange = function(player, range, type, data){
    var str = JSON.stringify({
        'type': type,
        'data': data
    });

    var receivers = this.findInRange(player,range);
    receivers.forEach(function(p){
        p.socket.send(str);
    });
}

module.exports = PlayerPool;