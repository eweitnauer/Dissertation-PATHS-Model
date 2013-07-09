var scale = 3, sim, scene, oracle;

function loadScene() {
  //scene = SVGSceneParser.parseFile("2-1.svg");
  scene = SVGSceneParser.parseFile("../../libs/pbp-svgs/svgs/pbp31/3-2.svg");
  //scene = SVGSceneParser.parseFile("../../libs/pbp-svgs/svgs/interpretation_tests/1-2.svg");
  //scene = SVGSceneParser.parseFile("../../libs/pbp-svgs/svgs/stability_tests/2-2.svg");
  // well now we could display the scenes, no?
  var display1 = document.getElementById('svg');
  var child; while (child = display1.childNodes[0]) { display1.removeChild(child); }
  scene.renderInSvg(document, display1, 0, 0, scale, true);

  // okay, next we will be so bold as to put the scene into a b2World
  world = new Box2D.Dynamics.b2World(new Box2D.Common.Math.b2Vec2(0, 10), true);
  var adapter = new Box2DAdapter();
  scene.pixels_per_unit = 50;
  scene.friction = 0.3;
  scene.resitution = 0.1;
  adapter.loadScene(world, scene, true, false);

  var display2 = document.getElementById('canvas');
  if (sim) sim.release();
  var ps = new PhysicsScene(world);
  sim = new Simulator(ps, display2, scene.pixels_per_unit*scale, true, false);
  //sim.play();
  oracle = new PhysicsOracle(ps);

  sn = new SceneNode(scene, oracle);
  sn.perceiveAll();
  console.log(sn.describe());
}

function init() {
  loadScene();
}