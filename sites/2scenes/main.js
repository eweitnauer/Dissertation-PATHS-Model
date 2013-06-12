var scale = 3, pixels_per_unit = 50;
var sim1, sim2, sn1, sn2, vis1, vis2, scene1, scene2;


function loadScenes() {
  // load scenes from SVGs
  //scene1 = SVGSceneParser.parseFile("../../libs/pbp-svgs/svgs/pbp04/1-1.svg", pixels_per_unit);
  scene1 = SVGSceneParser.parseFile("../../libs/pbp-svgs/svgs/pbp12/1-1.svg", pixels_per_unit);
  scene1.adjustStrokeWidth(0.5*pixels_per_unit/100);
  //scene2 = SVGSceneParser.parseFile("../../libs/pbp-svgs/svgs/pbp04/1-3.svg", pixels_per_unit);
  scene2 = SVGSceneParser.parseFile("../../libs/pbp-svgs/svgs/pbp12/1-3.svg", pixels_per_unit);
  scene2.adjustStrokeWidth(0.5*pixels_per_unit/100);

  // setup physics and simulator
  var world1 = new Box2D.Dynamics.b2World(new Box2D.Common.Math.b2Vec2(0, 10), true);
  var world2 = new Box2D.Dynamics.b2World(new Box2D.Common.Math.b2Vec2(0, 10), true);
  var adapter = new Box2DAdapter();
  adapter.loadScene(world1, scene1, true, false);
  adapter.loadScene(world2, scene2, true, false);
  var ps1 = new PhysicsScene(world1);
  var ps2 = new PhysicsScene(world2);
  sim1 = new Simulator(ps1, document.getElementById('canvas1'), pixels_per_unit*scale);
  sim2 = new Simulator(ps2, document.getElementById('canvas2'), pixels_per_unit*scale);

  sn1 = new SceneNode(scene1, new PhysicsOracle(ps1));
  sn1.perceiveAll(); ps1.reset();
  console.log("Scene 1\n" + sn1.describe());
  sn2 = new SceneNode(scene2, new PhysicsOracle(ps2));
  sn2.perceiveAll(); ps2.reset();
  console.log("Scene 2\n" + sn2.describe());
}

function init() {
  loadScenes();
  //solve04();
}

function solve04() {
  var s1, s2, sol;
  s1 = new Selector();
  s1.use_attr(sn2.objs[0].times.end.right_pos, 'end');
  sol = new Solution.Exists(s1, 'right');
  console.log(sol.describe() + ': ' + sol.check([sn1], [sn2]));

  s1 = new Selector();
  s1.use_attr(sn1.objs[0].times.start.shape);
  s2 = new Selector();
  s2.use_attr(sn2.objs[0].times.start.shape);
  sol = new Solution.All(s1, s2, 'left');
  console.log(sol.describe() + ': ' + sol.check([sn1], [sn2]));
}