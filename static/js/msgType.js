/*
* Stores all types of messages that can be
* sent/received by the game server and clients
*
* Implementation for working in browser adapted from
* http://www.richardrodger.com/2013/09/27/how-to-make-simple-node-js-modules-work-in-the-browser
*/

(function(){
    var caller = this;

    var MSG = {
        TYPE: {},
        SCHEMA:{},
    };

    function define(type,id,schema){
        MSG.TYPE[type] = id;
        MSG.SCHEMA[id] = schema;
    }
    //
    define(
        'ERROR',
        0,
        {
            'message':'string',
        }
    );
    define('LATENCY_REPORT',
        13,
        {

        }
    );
    define('START_LATENCY',
        14,
        {});
    define('STOP_LATENCY',
        14,
        {});
    // broadcast by the server when a player has connected
    define(
        'INFO_PLAYER_JOINED',
        1,
        {
            'playerName':'string',
        }
    );
    // broadcast by the server when a player has disconnected
    define(
        'INFO_PLAYER_LEFT',
        2,
        {
            'playerName':'string',
        }
    );
    // sent by the server when a player has connected
    define(
        'INFO_WORLD',
        3,
        {}
    );
    // broadcast by the server within range when a player moves
    define(
        'INFO_PLAYER_UPDATE',
        4,
        {
            'playerName':'string',
            'x':'number',
            'y':'number',
            'z':'number',
        }

    );
    // sent by the server when a player requests chunk information
    define(
        'INFO_CHUNKS',
        5,
        {}

    );
    // broadcast by the server within range when a player has changed a block
    define(
        'INFO_BLOCK_CHANGED',
        6,
        {
            'x':'number',
            'y':'number',
            'z':'number',
            //'t': 'string' is optional
        }
    );
    // sent by a player when connecting to the server
    define(
        'REQUEST_JOIN',
        7,
        {
            'playerName': 'string',
        }
    );
    //
    define(
        'PLAYER_CHAT_SENT',
        8,
        {
            'text': 'string',
        }
    );
    // sent by a player on movement
    define(
        'PLAYER_MOVED',
        9,
        {
            'x':'number',
            'y':'number',
            'z':'number',
        }
    );
    // sent by a player when he tries to load new chunks around him
    define('REQUEST_CHUNK_INFO',
        10,
        {
            'x':'number',
            'z':'number'
        }
    );

    // sent by a player when he right-clicks a block
    define(
        'REQUEST_BLOCK_DESTROY',
        11,
        {
            'x':'number',
            'y':'number',
            'z':'number',
        }
    );

    // sent by a player when he left-clicks a block
    define(
        'REQUEST_BLOCK_PLACE',
        12,
        {
            'x':'number',
            'y':'number',
            'z':'number',
            't':'string',
        }
    );

    // returns the payload of a
    // MessageEvent if it is valid
    //
    // typical MessageEvent structure
    // {
    //      type: string
    //      target: WebSocket
    //      data: JSON string (our payload) {
    //          type: string (the MSG type)
    //          data: Object (actual object passed)
    //      }
    //      ...
    // }
    MSG.validate = function(e){
        // assign payload
        var payload;
        if(typeof(e) === 'object'){
            payload = e;
        }else if(typeof(e) === 'string'){
            // try to parse the JSON payload
            try{
                payload = JSON.parse(e);
            } catch(err) {
                console.log(`Error trying to parse player message: "${e}"`);
                return false;
            }
        }else return false;

        //check message type
        //if(typeof(payload.type) !== 'string') return false;
        if(!Object.values(MSG.TYPE).includes(payload.type)) return false;

        // The passed message is valid
        // now validate the payload if possible

        //check if validation schema exists
        if(Object.keys(MSG.SCHEMA).includes(payload.type)){
            // validate according to message schema
            for(key in MSG.SCHEMA[payload.type]){
                var requiredType = MSG.SCHEMA[payload.type][key];
                //check if the key is valid
                if(typeof(payload.data[key]) !== requiredType)
                    return false;
            }
            // all keys are contained and valid;
            // message is valid
            return payload;

        } else {
            // nothing to validate further === payload is valid
            return payload;
        }
    }








    if( typeof exports !== 'undefined' ) {
        // caller is node
        if( typeof module !== 'undefined' && module.exports ) {
            exports = module.exports = MSG;
        }
        exports.MSG = MSG;
    } else {
        // caller is browser
        caller.MSG = MSG;
    }
}).call(this);
