var vis_scaling = 1.5, pixels_per_unit = 50;

var problems = {}; // array of hashes with the keys sim, oracle, scene, snode, svis
init_pbp_data();
var pbp_idx = getPBPFromURL() || 0;
var curr_sols = [];
var tester = null;
var log_area = null;

function analyzeScene(sn, svis) {
  sn.registerObjects();
  sn.perceiveCollisions();
}

function loadScenes(name, files) {
  var path = "./svgs/" + name;

  var heading = name.indexOf('pbp') === 0 ? 'PBP '+name.substring(3) : name;
  document.getElementById('pbp-num').innerText = heading;

  d3.selectAll("svg").remove();
  d3.selectAll("canvas").remove();
  create_html_elements(files);
  var adapter = new Box2DAdapter();
  problems = {};

  for (var i=0; i<files.length-4; i++) {
    console.log('loading and analyzing scene ' + files[i] + ' of ' + name + '...');
    var scene = SVGSceneParser.parseFile(path + "/" + files[i] + '.svg', pixels_per_unit);
    // quick hack to extract side from the file name
    if (files[i].split('-').length == 2 && Number(files[i].split('-')[1]) >= 3) {
      scene.side = 'right';
    } else scene.side = 'left';
    scene.name = files[i];

    scene.adjustStrokeWidth(0.5*pixels_per_unit/100);

    // create b2World
    var world = new Box2D.Dynamics.b2World(new Box2D.Common.Math.b2Vec2(0, 10), true);
    scene.friction = 0.3;
    scene.resitution = 0.1;
    adapter.loadScene(world, scene, true, false);

    // create PhysicsScene, Simulator and SceneNode with PhysicsOracle
    var el_canvas = document.getElementById('c'+files[i]);
    var ps = new PhysicsScene(world);
    //var sim = new Simulator(ps, el_canvas, scene.pixels_per_unit*vis_scaling, true);
    var sn = new SceneNode(scene, new PhysicsOracle(ps));

    // create SceneVisualizer
    var el_svg = document.getElementById('s'+files[i]);
    //var svis = new SceneVisualizer(scene, sn, el_svg, vis_scaling);
    //ps.onWorldChange.addListener(function(svis) { return function() {svis.draw_scene()} }(svis))
    //svis.draw_scene();
    analyzeScene(sn);
    var svis = new SceneInteractor(ps, sn, el_svg);
    svis.scaling(vis_scaling);
    setup_scene_vis();
    problems[files[i]] = {sn: sn, svis: svis};//, sim: sim};
  }
}

function setup_scene_vis() {
  for (var i in problems) {
    var p = problems[i];
    p.svis.colorize_values(function(on) {
      if (!on || !tester || !tester.ws) return 0;
      return tester.ws.attentionNet.getActivity(on) * 100;//getAttentionValue(on) * 100;
    });
    p.svis.draw();
  }
}

function create_html_elements(files) {
  var a = 100*vis_scaling, mar = 0;
  d3.select('#vis')
    .style({width: 4*a + (2*10+8)*vis_scaling + 2*mar + 22 + 'px'});
  d3.select("#svgs")
    .style('height', 4*a+2+mar + 'px')
    .selectAll("svg")
    .data(files.slice(0, files.length-4))
    .enter()
    .append("svg")
    .attr("id", function(d) { return "s"+d })
    .style({width: a, height: a})
    .style('left', function(d, i) {
      var col = i%4;
      return mar + ((col < 2) ? col*a : col*a + (2*10+8)*vis_scaling);
    })
    .style('top', function(d, i) {
      var row = Math.floor(i/4);
      return row*a;
    });

  update_scene_styles();

  d3.select("#svgs")
    .append('div')
    .style({ position: 'absolute', background: '#aaa', border: '1px solid black'
           , width: 8*vis_scaling+'px', left: mar + 2*a+10*vis_scaling+'px', top: 0
           , height: 4*a+'px' });
}

function update_scene_styles() {
  var show_all = !d3.select('#only-show-active-scenes').property('checked');
  d3.selectAll('#svgs svg')
    .classed('show', show_all);
}

function next() {
  pbp_idx += 1;
  if (pbp_idx >= pbps.length) pbp_idx = 0;
  tester.pause();
  tester = null;
  loadScenes(pbps[pbp_idx].name, pbps[pbp_idx].files);
  createTester();
}

function prev() {
  pbp_idx -= 1;
  if (pbp_idx < 0) pbp_idx = pbps.length-1;
  tester.pause();
  tester = null;
  loadScenes(pbps[pbp_idx].name, pbps[pbp_idx].files);
  createTester();
}

function disable_drawing() {
  for (var p in problems) problems[p].svis.drawing = false;
}

function enable_drawing() {
  for (var p in problems) problems[p].svis.drawing = true;
}

function after_step_callback() {
  d3.select('#solver-step').text(tester.curr_step-1);
  updateHypothesisTable();
  updateFeatureList();
  updateActiveScenes();
  updateSolutionList();
  updateCodeletStats();
  for (var p in problems) problems[p].svis.draw();
}

function updateActiveScenes() {
  for (var p in problems) problems[p].sn.active = false;
  tester.getActiveScenes().forEach(function(scene) {
    scene.active = true;
  });
}

function finish_callback() {
  d3.select('#solver-run-btn').text('Run');
  tester.auto_next = false;
}

function updateFeatureList() {
  tester.updateFeatureList(d3.select("#features").node(), featureClicked);
}

function updateCodeletStats() {
  tester.updateCodeletStats(d3.select('#codelet-stats').node());
}

function updateSolutionList() {
  tester.updateSolutionList(d3.select("#solutions ol").node());
  tester.updateLastSolution(d3.select('#last-solution').node());
}

function updateHypothesisTable() {
  tester.updateHypothesisTable(d3.select("#selector-table").node(), hypothesisClicked);
}

function hypothesisClicked(hyp) {
  console.log('sel=', hyp.describe());
  sel = hyp;
  // apply the hyp to all scenes
  for (var p in problems) {
    problems[p].svis.applySolution(hyp);
  }
}

function featureClicked(feature) {
  if (feature.prototype.initial_apriori !== feature.prototype.apriori) {
    tester.ws.resetFeaturePrior(feature);
    tester.ws.setSelectorPrior(feature.prototype.key, {1: 'attr', 2: 'rel'}[feature.prototype.arity], 1);
  } else {
    tester.ws.setFeaturePrior(feature, 5);
    tester.ws.setSelectorPrior(feature.prototype.key, {1: 'attr', 2: 'rel'}[feature.prototype.arity], 10);
  }
  updateFeatureList();
  updateHypothesisTable();
}

function logText(text) {
  log_area.insert('div','div').text(text);
  //log_area.node().scrollTop = log_area.node().scrollHeight; // very slow
}

function createTester() {
  var scenes = [];
  for (var p in problems) scenes.push(problems[p].sn);
  tester = new PITester('current', scenes, 1, 5000, 1, 'info');
  //tester.setLogCallback(logText);
  d3.select('#solver h2').text('PATHS v' + tester.pi.version);
  d3.select('#solver-step').text('0');
  tester.after_step_callback = after_step_callback;
  tester.finish_callback = finish_callback;
  d3.select('#solutions ol').selectAll('li').remove();
  d3.select('#codelet-stats').selectAll('*').remove();
  d3.select('#last-solution').text('');
  resetClicked();
}

function resetClicked() {
  tester.reset();
  d3.select('#solver-step').text('0');
  log_area.selectAll('*').remove();
  updateHypothesisTable();
  updateFeatureList();
  updateActiveScenes();
  updateSolutionList();
  updateCodeletStats();
  for (var p in problems) {
    problems[p].svis.selectShapes([]);
    problems[p].svis.draw();
  }
}

function setup_solve() {
  d3.select('#show-hide-2')
  .on('click', function () {
    var n = d3.select('#solution');
    n.style('display', n.style('display') == 'none' ? 'block' : 'none')
  });

  d3.select('#solver-reset-btn').on('click', resetClicked);

  d3.select('#solver-step-btn').on('click', function() {
    tester.step();
  });

  d3.select('#solver-run-btn').on('click', function() {
    if (tester.auto_next) {
      tester.pause();
      d3.select(this).text('Run');
    } else {
      tester.run();
      d3.select(this).text('Pause');
    }
  });


  d3.select('#solve')
  .on('click', function () {
    console.log("scenes = []; for (p in problems) scenes.push(problems[p].sn);");
    scenes = []; for (p in problems) scenes.push(problems[p].sn);

    console.log("tester = new PITester('current', scenes, 20, 1000, 1, 'warn')");
    tester = new PITester('current', scenes, 20, 1000, 1, 'warn');
    tester.start_callback = disable_drawing;
    tester.finish_callback = enable_drawing;

    console.log("res = tester.run()");
    res = tester.run();
  });

  d3.select('#solve-debug')
  .on('click', function () {
    console.log("scenes = []; for (p in problems) scenes.push(problems[p].sn);");
    scenes = []; for (p in problems) scenes.push(problems[p].sn);

    console.log("tester = new PITester('current', scenes, 1, 200, 1, 'debug')");
    tester = new PITester('current', scenes, 1, 200, 1, 'debug');
    tester.start_callback = disable_drawing;
    tester.finish_callback = enable_drawing;

    console.log("res = tester.run()");
    res = tester.run();

    for (p in problems) problems[p].svis.colorize_values(function(on) {
      return on.getActivity();
    });
  });
}

function update_solutions(sols) {
  var texts = d3.select('#sol-texts')
    .selectAll('p')
    .remove();

  var texts = d3.select('#sol-texts')
    .selectAll('p')
    .data(sols)
    .enter()
    .append("p")
    .text(function (d) { return d.describe() })
    .append("button")
    .text("check")
    .on('click', function(d) {
       var ls = [], rs = [], svis = [];
       d3.values(problems).forEach(function (p) {
         if (p.sn.side == 'right') rs.push(p.sn);
         else ls.push(p.sn);
         svis.push(p.svis);
      });
      console.log(d.describe(), ':', d.check(ls, rs));
    });
}

/** Takes the current situation in all problems as the new initial situations,
 * creating a new version of the original problem. */
function curr_as_start() {
  d3.values(problems).forEach(function (p) {
    var s = p.sn;
    s.groups = [];
    s.objs.forEach(function (o) {
      o.times.start = {};
      o.times.end = {};
    });
    p.svis.pause();
    p.sn.oracle.useCurrAsInitialState();
    p.sn.oracle.gotoState('start');
  });

}

function set_time(time) {
  d3.values(problems).forEach(function (p) {
    p.svis.pause();
    p.sn.oracle.gotoState(time);
  });
}

function init() {
  span = document.getElementById('curr_num');
  setup_solve();
  d3.select('#curr-as-start').on('click', curr_as_start);
  d3.select('#jump-to-zero').on('click', set_time.bind(null, '0'));
  d3.select('#jump-to-start').on('click', set_time.bind(null, 'start'));
  d3.select('#jump-to-end').on('click', set_time.bind(null, 'end'));
  d3.select('#only-show-active-scenes').on('click', update_scene_styles);
  loadScenes(pbps[pbp_idx].name, pbps[pbp_idx].files);
  log_area = d3.select('#debug-text');
  createTester();
}

function init_pbp_data() {
  default_files = ['1-1', '1-2', '1-3', '1-4'
                      ,'2-1', '2-2', '2-3', '2-4'
                      ,'3-1', '3-2', '3-3', '3-4'
                      ,'4-1', '4-2', '4-3', '4-4'
                      ,'5-1', '5-2', '5-3', '5-4'];
  pbps = [
    {name: 'pbp02',  files: default_files, solution: ["one object", "two objects"]},
    {name: 'pbp04',  files: default_files, solution: ["squares", "circles"]},
    {name: 'pbp08',  files: default_files, solution: ["unstable situation", "stable situation"]},
    {name: 'pbp11b', files: default_files, solution: ["objects close to each other", "objects far from each other"]},
    {name: 'pbp12',  files: default_files, solution: ["small object falls off", "small object stays on top"]},
    {name: 'pbp13',  files: default_files, solution: ["objects form a tower", "objects form an arc"]},
    {name: 'pbp16',  files: default_files, solution: ["the circle is left of the square", "the square is left of the circle"]},
    {name: 'pbp18',  files: default_files, solution: ["object touch eventually", "objects don't touch eventually"]},
    {name: 'pbp20',  files: default_files, solution: ["the square supports other objects", "the square does not support other objects"]},
    {name: 'pbp22',  files: default_files, solution: ["objects collide with each other", "objects don't collide with each other"]},
    {name: 'pbp26',  files: default_files, solution: ["circle moves right", "circle moves left"]},
    {name: 'pbp30',  files: default_files, solution: ["less stable situation", "stable situation"]},
    {name: 'pbp31',  files: default_files, solution: ["circle can be picked up directly", "circle cannot be picked up directly"]},
    {name: 'pbp35',  files: default_files, solution: ["triangle moves", "triangle does not move"]},
    {name: 'pbp36',  files: default_files, solution: ["small objects hits large object", "small object does not hit large object"]},
    {name: 'pbp23',  files: default_files, solution: ["collision", "no collision"]},
    {name: 'pbp32',  files: default_files, solution: ["objects rotate a lot", "objects rotate little or no at all"]},
    {name: 'pbp27',  files: default_files, solution: ["(potential) chain reaction","no chain reaction"]},
    {name: 'pbp24',  files: default_files, solution: ["several possible outcomes", "one possible outcome"]},
    {name: 'pbp21',  files: default_files, solution: ["strong collision", "weak or no collision"]},
    {name: 'pbp09',  files: default_files, solution: ["objects move in opposite directions", "objects move in same direction"]},
    {name: 'pbp33',  files: default_files, solution: ["construction gets destroyed", "construction stays intact"]},
    {name: 'pbp19',  files: default_files, solution: ["at least one object flies through the air", "all object always touch something"]},
    {name: 'pbp28',  files: default_files, solution: ["rolls well", "does not roll well"]},
    {name: 'stability_tests', files: ['1-1', '1-2', '1-3', '2-1', '2-2', '2-3', '3-1', '3-2', '3-3', '4-1', '4-2', '4-3', '5-1', '5-2', '6-1', '7-1', '7-2', '8-1', '8-2']},
    {name: 'support_tests', files: ['1-1', '1-2', '1-3', '1-4', '2-1', '2-2', '2-3', '3-1', '3-2']},
  ];
}

function getPBPFromURL() {
  var str = getURLParameter('pbp') || getURLParameter('PBP');
  if (!str) return false;
  for (var i=0; i<pbps.length; i++) {
    if (pbps[i].name === 'pbp'+str) return i;
    if (pbps[i].name === 'pbp0'+str) return i;
    if (pbps[i].name === str) return i;
  }
  return 0;
}

function getURLParameter(name) {
  var val = RegExp(name + '=' + '(.+?)(&|$)').exec(location.search);
  return val ? decodeURIComponent(val[1]) : null;
}
