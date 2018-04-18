const WS_URI         = 'ws://127.0.0.1:3000';

function Game(container){
    this.container = container;
    // has the server accepted this player?
    this.joined = false;
    // info about the multiplayer world
    this.worldInfo = null;
    this.world = null;
    this.player = null;
    this.renderer = null;
}
Game.prototype.connect = function(){
    this.wsURI = document.getElementById("ipaddr").value;
    this.pName = document.getElementById("pname").value;

    if(this.wsURI.length < 7) return false;
    if(this.pName.length < 3) this.pName = 'Guest';
    if(!this.wsURI.startsWith('ws://')) this.wsURI = 'ws://' + this.wsURI;
    this.wsURI = this.wsURI + ":3000";

    document.getElementById('btnConnect').textContent = 'Connecting';
    // create the socket and connect
    this.ws = new WebSocket(this.wsURI);
    this.ws.onerror = this.handlers.onError.bind(this);
    // listen for 'open' event
    //TODO: avoid using bind in addEventListener as it may cause memory leaks!
    this.ws.onopen = this.handlers.onOpen.bind(this);
}
Game.prototype.handlers = {
    onError: function(err){
        //show connection dialog
        document.getElementById('btnConnect').textContent = 'Error connecting; Retry?';
        document.findElementById('connectDialog').style.display = 'flex';
    },
    onOpen: function(event){
        // socket connection has been accepted
        document.getElementById('btnConnect').textContent = 'Logging in';
        // relay player information
        this.ws.send(JSON.stringify({
            'type': MSG.TYPE.REQUEST_JOIN,
            'data': {
                'playerName': this.pName
            },
        }));
        //TODO: avoid using bind in addEventListener as it may cause memory leaks!
        this.ws.addEventListener('message', this.handlers.onMessage.bind(this));
    },
    onMessage: function(msgEvent){
        var payload = MSG.validate(msgEvent.data);
        if(!payload) return;

        // keep a shortcut to the data
        var data = payload.data;

        switch (payload.type) {
            case MSG.TYPE.PLAYER_CHAT_SENT:
                var el = document.createElement("div");
                el.setAttribute("class","message");
                el.textContent = data.text;
                document.getElementById("history").appendChild(el);
                break;
            case MSG.TYPE.INFO_WORLD:
                // server is sending information about the world
                // only accept if player has not joined yet
                if(this.joined !== false) break;
                // server is sending world information
                // which means that the player is accepted
                this.worldInfo = payload.data;
                // we can now also construct the world using
                // the worldInfo given
                this.onPlayerJoined();
                break;
            case MSG.TYPE.INFO_BLOCK_CHANGED:
                // server broadcasting a node change around us
                // note: data.t is not validated,
                //       so we need to manually validate it here
                if(typeof(data.t) === 'string'){
                    this.world.addNode(data.x,data.y,data.z,data.t);
                } else {
                    this.world.removeNode(
                        this.world.getNode(data.x,data.y,data.z)
                    );
                }
                break;
            case MSG.TYPE.INFO_CHUNKS:
                // we have requested information for the surrounding
                // chunks and the server has responded: load them\
                this.world.mapGrid9(data.origin.x,data.origin.z);
                this.world.mapChanges(data.changes);
            default:

        }
    }
}
Game.prototype.onPlayerJoined = function(){
    this.joined = true;
    this.world = new World(
        this.worldInfo.seed,
        this.worldInfo.spawn.x,
        this.worldInfo.spawn.z
    );
    this.player = new Player(this.ws,this.world);
    this.renderer = new Renderer(this.ws,this.container, this.world, this.player);

    this.initChat();
    //hide dialog
    document.getElementById('btnConnect').textContent = 'Connect';
    document.getElementById('connectDialog').style.display = 'none';
    //focus canvas
    document.getElementById('canvas').focus();
}

Game.prototype.initChat = function(){
    // CHAT functionality
    this.message = document.getElementById("txtMessage");
    this.message.onkeypress = function(e){
        if(e.code !== "Enter") return;
        if(this.message.value.length < 1) return;
        var msg = JSON.stringify({
            type: MSG.TYPE.PLAYER_CHAT_SENT,
            data:{
                text: this.message.value,
            }
        });
        //send the message
        this.ws.send(msg);
        this.message.value = "";
        document.getElementById('canvas').focus();
        return true;
    }.bind(this);
}
