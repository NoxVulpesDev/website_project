var stage

function init(){
    stage = new createjs.Stage("IntCanvas");
    stage.enableDOMEvents(true);

     stage.on("stagemousedown", function(evt){
        drawCircle(evt.stageX,evt.stageY);
    })
}

function drawCircle(posX, posY){
    var circle = new createjs.Shape();
    circle.graphics.beginFill("DeepSkyBlue").drawCircle(0, 0, 50);
    circle.x = posX;
    circle.y = posY;
    stage.addChild(circle);
    stage.update();
}