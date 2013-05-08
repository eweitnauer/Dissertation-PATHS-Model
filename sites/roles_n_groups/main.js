var vis_scaling = 3, pixels_per_unit = 50, sim, scene, oracle;

function loadScene() {
  //scene = SVGSceneParser.parseFile("../../libs/pbp-svgs/svgs/pbp26/3-1.svg");
  //scene = SVGSceneParser.parseFile("../../libs/pbp-svgs/svgs/pbp33/1-1.svg");
  scene = SVGSceneParser.parseFile("../../libs/pbp-svgs/svgs/pbp33/5-2.svg", pixels_per_unit);
  scene.adjustStrokeWidth(0.5*pixels_per_unit/100);
  // well now we could display the scenes, no?
  var display1 = document.getElementById('svg1');
  var child; while (child = display1.childNodes[0]) { display1.removeChild(child); }
  scene.renderInSvg(document, display1, 0, 0, vis_scaling, true);

  // okay, next we will be so bold as to put the scene into a b2World
  world = new Box2D.Dynamics.b2World(new Box2D.Common.Math.b2Vec2(0, 10), true);
  var adapter = new Box2DAdapter();
  scene.friction = 0.3;
  scene.resitution = 0.1;
  adapter.loadScene(world, scene, true, false);

  var display2 = document.getElementById('canvas');
  if (sim) sim.release();
  var ps = new PhysicsScene(world);
  sim = new Simulator(ps, display2, scene.pixels_per_unit*vis_scaling, true);
  //sim.play();
  oracle = new PhysicsOracle(ps);

  sn = new SceneNode(scene, oracle);
  svis = new SceneVisualizer(scene, sn, d3.select('#svg2').node(), vis_scaling);
  ps.onWorldChange.addListener(function() { svis.draw_scene() })
  svis.draw_scene();

  //sn.perceive();
  sn.oracle.gotoState('start');
  sn.perceiveCurrent('start');
  sn.describe();
  console.log('movement attention:', get_movement_attention(sn));
  console.log('top attention:', get_top_attention(sn));
  var s1, s2, s3, s4, s5, winner;
  console.log('spatial saliency:', s1=get_spatial_saliency(sn));
  console.log('size saliency:', s2=get_size_saliency(sn));
  console.log('shape saliency:', s3=get_shape_saliency(sn));
  console.log('movement saliency:', s4=get_move_saliency(sn));
  console.log('mean saliency:', s5=mean_hashes([s1,s2,s3,s4]));
  var winners = hash_get_maxima(s5);
  console.log('max saliency:', winners.keys, '==>', winners.value);
  sim.pscene.reset();
  var winner_shapes = [];
  for (var i=0; i<winners.keys.length; i++) {
    scene.shapes[winners.keys[i]].renderInSvg(document, d3.select('svg g')[0][0]);
    winner_shapes.push(scene.shapes[winners.keys[i]]);
  }
  svis.colorize(function(shape) { return s5[shape.id] });
}

function init() {
  loadScene();
}

function hash_get_maxima(h) {
  var keys=[], val=-Infinity;
  for (var a in h) {
    if (!h.hasOwnProperty(a)) continue;
    if (h[a] > val) val = h[a];
  }
  for (var a in h) {
    if (!h.hasOwnProperty(a)) continue;
    if (h[a] == val) keys.push(a);
  }
  return {keys: keys, value: val};
}

function mean_hashes(arr) {
  var res = {};
  for (var a in arr[0]) {
    if (!arr[0].hasOwnProperty(a)) return;
    res[a] = 0;
    for (var i=0; i<arr.length; i++) res[a] += arr[i][a] / arr.length;
  }
  return res;
}

function get_movement_attention(sn) {
  var count=0, res = {};
  for (var i=0; i<sn.parts.length; i++) {
    if (sn.parts[i].states.start.moves.get_activity()>=0.5) count+=3
    else if (sn.parts[i].states.start.stability.get_label() == 'unstable') count++;
  };
  for (var i=0; i<sn.parts.length; i++) {
    if (sn.parts[i].states.start.moves.get_activity()>=0.5) {
      res[sn.parts[i].obj.id] = 3*100/count;
    } else if (sn.parts[i].states.start.stability.get_label() == 'unstable') {
      res[sn.parts[i].obj.id] = 100/count;
    } else res[sn.parts[i].obj.id] = 0;
  };
  return res;
}

function get_top_attention(sn) {
  var count=0, res = {};
  for (var i=0; i<sn.parts.length; i++) {
    if (sn.parts[i].states.start.top_pos.get_activity()>=0.5) count++;
  };
  for (var i=0; i<sn.parts.length; i++) {
    if (sn.parts[i].states.start.top_pos.get_activity()>=0.5) {
      res[sn.parts[i].obj.id] = 100/count;
    } else res[sn.parts[i].obj.id] = 0;
  };
  return res;
}

function get_spatial_saliency(sn) {
  var gs = sn.oracle.getSpatialGroups(0.08);
  var hg = new HashGroup(gs.length);
  for (var i=0; i<gs.length; i++) hg[i] = gs[i].map(function(body) { return body.master_obj });
  return get_uniqueness(hg);
}

function get_move_saliency(sn) {
  var hg = group_by_attr(sn.parts, 'moves');
  return get_uniqueness(hg);
}

function get_size_saliency(sn) {
  var hg = group_by_attrs(sn.parts, ['small', 'large']);
  return get_uniqueness(hg);
}

function get_shape_saliency(sn) {
  var hg = group_by_multivalued_attr(sn.parts, 'shape');
  // put rect, square and triangle in one subgroup
  if (hg.rectangle || hg.triangle || hg.square) {
    hg.N++;
    hg.angular = [];
    if (hg.rectangle) { hg.angular.push(hg.rectangle); hg.N--; delete hg.rectangle; }
    if (hg.square) { hg.angular.push(hg.square); hg.N--; delete hg.square; }
    if (hg.triangle) { hg.angular.push(hg.triangle); hg.N--; delete hg.triangle; }
  }
  return get_uniqueness(hg);
}

var HashGroup = function(N) {
  this.N = N || 0;
}

HashGroup.prototype.forEachValue = function(f) {
  for (var attr in this) {
    if (attr == 'N' || !this.hasOwnProperty(attr)) continue;
    f(this[attr]);
  }
}

/// Example return: {0: [O1], 1: [O2, O3], N: 2} where N is the number of values.
function group_by_attr(objs, attr) {
  var hg = new HashGroup();
  for (var i=0; i<objs.length; i++) {
    var val = objs[i].states.start[attr].get_activity() >= 0.5 ? 1 : 0;
    if (!hg[val]) { hg[val] = []; hg.N++ }
    hg[val].push(objs[i].obj);
  }
  return hg;
}

/// Example return: {rect: [O1], square: [O2, O3], N: 2} where N is the number of values.
function group_by_multivalued_attr(objs, attr) {
  var gs = new HashGroup();
  for (var i=0; i<objs.length; i++) {
    var val = objs[i].states.start[attr].get_label();
    if (!gs[val]) { gs[val] = []; gs.N++ }
    gs[val].push(objs[i].obj);
  }
  return gs;
}

/// Example return: {small: [O1], large: [O2, O3], N: 2} where N is the number of attrs
/// that were found. Each object is put into the attr-group were it had the highest activity.
function group_by_attrs(objs, attrs) {
  var gs = new HashGroup();
  for (var i=0; i<objs.length; i++) {
    var max_val = -Infinity, max_attr = null;
    for (var j=0; j<attrs.length; j++) {
      if (objs[i].states.start[attrs[j]].get_activity() > max_val) {
        max_val = objs[i].states.start[attrs[j]].get_activity();
        max_attr = attrs[j];
      }
    };
    if (max_attr) {
      if (!gs[max_attr]) { gs[max_attr] = []; gs.N++ }
      gs[max_attr].push(objs[i].obj);
    }
  }
  return gs;
}

/// Pass a (nested) HashGroup keys N and name:[obj or hash] to get an hash that holds the pecularity
/// value (in [0, 100]) for each node's id.
/// Example: {small: [O1], large: [O2, O3], N: 2} ==> {1: 50, 2: 25, 3: 25}.
function get_uniqueness(hg) {
  var res = {};
  var f = function(X, factor) {
    if (X instanceof HashGroup) {
      X.forEachValue(function(el) {
        if (el instanceof HashGroup || Array.isArray(el)) f(el, factor/X.N);
        else res[el.id] = Math.round(factor/X.N);
      });
    } else if (Array.isArray(X)) {
      for (var i=0; i<X.length; i++) {
        var el = X[i];
        if (el instanceof HashGroup || Array.isArray(el)) f(el, factor/X.length);
        else res[el.id] = Math.round(factor/X.length);
      }
    }
  }
  f(hg, 100);
  return res;
}