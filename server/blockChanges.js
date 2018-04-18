/*
* A class handling information about altered blocks
*/
function BlockChanges(){
    this.changes = [];
}
BlockChanges.prototype.addChange = function(x,y,z,type){
    var chunkx = Math.floor(x/16);
    var chunkz = Math.floor(z/16);
    //select the chunk matching the block's chunk
    var chunkArr = this.changes.filter(
        (item) => item.position.x == chunkx && item.position.z == chunkz
    );

    if(chunkArr.length == 0){
        // no changes in this chunk
        // add the chunk to the changes log
        var chunk = {
            position: {
                x:chunkx,
                z:chunkz
            },
            changes: {
                [`${x}_${y}_${z}`]: type,
            },
        }
        this.changes.push(chunk);
    }else {
        chunkArr[0].changes[`${x}_${y}_${z}`] = type;
    }
}
BlockChanges.prototype.getChanges = function (chunkx,chunkz) {
    var chunkArr = this.changes.filter(
        (item) => item.position.x == chunkx && item.position.z == chunkz
    );
    return chunkArr.length < 1 ? null : chunkArr[0];
};
BlockChanges.prototype.getChangesGrid9 = function (chunkx,chunkz) {
    var chunkArr = this.changes
        .filter(function(item){
            return Math.abs(item.position.x - chunkx) <= 1 &&
                   Math.abs(item.position.z - chunkz) <=1
            }
        );
    return chunkArr;
};

module.exports = BlockChanges;
