var scale = 3, pixels_per_unit = 50;
var sim1, sim2, sn1, sn2, vis1, vis2, scene1, scene2;



function loadScenes() {
  // load scenes from SVGs
  scene1 = SVGSceneParser.parseFile("../../libs/pbp-svgs/svgs/pbp12/1-1.svg", pixels_per_unit);
  scene1.adjustStrokeWidth(0.5*pixels_per_unit/100);
  setupPhysics(scene1, document.getElementById('canvas1'));
  scene2 = SVGSceneParser.parseFile("../../libs/pbp-svgs/svgs/pbp12/1-3.svg", pixels_per_unit);
  scene2.adjustStrokeWidth(0.5*pixels_per_unit/100);
  setupPhysics(scene2, document.getElementById('canvas2'));
}

function setupPhysics(scene, canvas) {
  var world = new Box2D.Dynamics.b2World(new Box2D.Common.Math.b2Vec2(0, 10), true);
  var adapter = new Box2DAdapter();
  adapter.loadScene(world, scene, true, false);
  var ps = new PhysicsScene(world);
  sim = new Simulator(ps, canvas, pixels_per_unit*scale);
}

function init() {
  setupDragListeners();
  loadScenes();
}

function setupDragListeners() {
  disableDefaultDnD();
  var c1 = document.getElementById('canvas1');
  c1.ondragover = function(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };
  c1.ondrop = function(e) {
    e.preventDefault();
    console.log("Reading...");
    var length = e.dataTransfer.items.length;
    if(length > 1){
      console.log("Please only drop 1 file.");
    } else {
      upload(e.dataTransfer.files[0]);
    }
  }
}

function disableDefaultDnD() {
  window.addEventListener("dragover",function(e){
    e = e || event;
    e.preventDefault();
  },false);
  window.addEventListener("drop",function(e){
    e = e || event;
    e.preventDefault();
  },false);
}

// /* main upload function */
function upload(file) {
  if (file.type == 'image/svg+xml') {
    reader = new FileReader();
    reader.onload = function(e) {
      console.log('loaded file content: ', e);
      scene1 = SVGSceneParser.parseString(e.target.result, pixels_per_unit);
      scene1.adjustStrokeWidth(0.5*pixels_per_unit/100);
      setupPhysics(scene1, document.getElementById('canvas1'));
    }
    reader.readAsText(file);
  } else {
    console.log('wrong file type, please drop SVGs only');
  }
}
