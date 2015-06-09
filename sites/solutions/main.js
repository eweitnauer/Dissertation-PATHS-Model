var vis_scaling = 1.5, pixels_per_unit = 50;//, sim, scene, oracle;

function analyzeScene(sn, svis) {
  sn.registerObjects();
  sn.perceiveCollisions();
  //sn.perceiveAll();
  //sn.oracle.gotoState('start');
  //sn.perceiveCurrent('start');
  //sn.oracle.pscene.reset();
}

function getSolutions(pbp) {
  var sols = [];
  if (pbp == 'pbp02') { // one vs. two objects
    var s = new Selector().add_attr(new Selector.AttrMatcher('count', '2'));
    sols.push(new Solution(s, 'right', 'exists'));
  }
  if (pbp == 'pbp04') { // square vs. circle
    var s1 = new Selector().add_attr(new Selector.AttrMatcher('shape', 'square'))
       ,s2 = new Selector().add_attr(new Selector.AttrMatcher('shape', 'circle'));
    sols.push(new Solution(s1, 'left', 'all'));
    sols.push(new Solution(s2, 'right', 'exists'));
  }
  if (pbp == 'pbp08' || pbp == 'pbp30') { // stable vs. unstable
    /// NEEDS 'slightly unstable' as 'stable' for pbp08 and as unstable for pbp30!
    var s1 = new Selector().add_attr(new Selector.AttrMatcher('unstable', 'unstable'))
       ,s2 = new Selector().add_attr(new Selector.AttrMatcher('stable', 'stable'));
    sols.push(new Solution(s1, 'left', 'exists'));
    sols.push(new Solution(s2, 'right', 'all'));
  }
  if (pbp == 'pbp11b') { // close vs. far
    var s = new Selector().add_attr(new Selector.AttrMatcher('close', 'close'));
    sols.push(new Solution(s, 'left', 'exists'));
  }
  if (pbp == 'pbp12') { // falls off vs. stays
    var s = new Selector(true).add_attr(new Selector.AttrMatcher('small', 'small'))
       ,any = new Selector();
    s.add_rel(new Selector.RelMatcher(any, 'on_top_of', 'on-top-of', true, 'end'));
    sols.push(new Solution(s, 'right', 'unique'));
  }
  if (pbp == 'pbp13') { // tower vs. arc
    var s  = new Selector().add_attr(new Selector.AttrMatcher('on_ground', 'on-ground', true, 'end'))
                           .add_attr(new Selector.AttrMatcher('count', '1'));
    sols.push(new Solution(s, 'left', 'exists'));
  }
  if (pbp == 'pbp16') { // circle left vs. circle right
    var s1 = new Selector(true).add_attr(new Selector.AttrMatcher('shape', 'circle'))
                               .add_attr(new Selector.AttrMatcher('left_most', 'left-most'));
    var sq = new Selector(true).add_attr(new Selector.AttrMatcher('shape', 'square'));
    var s2 = new Selector(true).add_attr(new Selector.AttrMatcher('shape', 'circle'))
                               .add_rel(new Selector.RelMatcher(sq, 'left_of', 'left-of'));
    sols.push(new Solution(s1, 'left', 'unique'));
    sols.push(new Solution(s2, 'left', 'unique'));
  }
  if (pbp == 'pbp18') { // touch
    var s1 = new Selector(true).add_attr(new Selector.AttrMatcher('touching', 'touching', true, 'end'));
    sols.push(new Solution(s1, 'left', 'exists'));
  }
  if (pbp == 'pbp20') { // support
    var s1 = new Selector()
        .add_attr(new Selector.AttrMatcher('shape', 'square'))
        .add_rel(new Selector.RelMatcher(new Selector(), 'supports', 'supporting'));
    sols.push(new Solution(s1, 'left', 'exists'));

    var s2 = new Selector(true).add_attr(new Selector.AttrMatcher('shape', 'square'))
                               .add_rel(new Selector.RelMatcher(new Selector(), 'supports', 'supporting'));
    sols.push(new Solution(s2, 'left', 'unique'));
  }
  if (pbp == 'pbp22') { // objects hit each other vs. not
    var s1 = new Selector().add_rel(new Selector.RelMatcher(new Selector(true), 'hits', 'hits'));
    var s2 = new Selector().add_rel(new Selector.RelMatcher(new Selector(), 'collides', 'collides-with'));
    sols.push(new Solution(s1, 'left', 'exists'));
    sols.push(new Solution(s2, 'left', 'all'));
  }
  if (pbp == 'pbp26') { // circle moves left vs. circle moves right; many objects
    var s = new Selector(true);
    s.add_attr(new Selector.AttrMatcher('shape', 'circle'));
    s.add_attr(new Selector.AttrMatcher('left_pos', 'left', true, 'end'));
    sols.push(new Solution(s, 'right', 'unique'));

    // not working with the last row of scenes
    var s1 = new Selector(true);
    s1.add_attr(new Selector.AttrMatcher('shape', 'circle'));
    s1.add_attr(new Selector.AttrMatcher('left_most', 'left-most', true, 'end'));
    sols.push(new Solution(s1, 'right', 'unique'));
  }
  if (pbp == 'pbp31') { // can move up
    var s = new Selector(true)
        .add_attr(new Selector.AttrMatcher('shape', 'circle'))
        .add_attr(new Selector.AttrMatcher('can_move_up', 'can-move-up'));
    sols.push(new Solution(s, 'left', 'unique'));
  }
  return sols;
}


var options = [
  {name: 'attention', checked: true, opts: []}
 ,{name: 'feature', multiple: true, opts: [{name: 'moves', checked: true}
                            ,{name: 'top-most'}
                            ,{name: 'single'}]}
 ,{name: 'uniqueness', multiple: true, opts: [{name: 'spatial', checked: true}
                           ,{name: 'size'}
                           ,{name: 'shape'}
                           ,{name: 'moves'}]}
 ,{name: 'groups', multiple: false, opts: [{name: 'close', checked: true}
                         ,{name: 'touch'}
                         ,{name: 'size'}
                         ,{name: 'shape'}
                         ,{name: 'moves'}
                         ,{name: 'stability'}]}
]

function option_callback(d) {
  for (var i in problems) {
    var p = problems[i];
    var opts = {};
    d.opts.forEach(function (o) { if (o.checked) opts[o.name] = true });
    if (d.name == 'attention') {
      p.svis.colorize_values(function(on) {
        if (!on || !tester || !tester.ws) return 0;
        return tester.ws.attentionNet.getActivity(on) * 100;//getAttentionValue(on) * 100;
      });
      p.svis.draw();
    } else if (d.name == 'groups') {
      var groups;
      if (opts.close) groups = group_by_distance(p.sn);
      else if (opts.touch) groups = group_by_distance(p.sn, 0.001);
      else if (opts.size) groups = group_by_attributes(p.sn.objs, ['small', 'large']);
      else if (opts.shape) groups = group_by_shape(p.sn.objs);
      else if (opts.moves) groups = group_by_attributes(p.sn.objs, ['moves']);
      else if (opts.stability) groups = group_by_attributes(p.sn.objs, ['stability']);
      groups = inverse_aa(groups);
      p.svis.colorize_groups(function(groups) { return function(shape) { return groups[shape.id] }}(groups));
    } else if (d.name == 'feature') {
      var vals = [];
      if (opts['top-most']) vals.push(get_top_attention(p.sn));
      if (opts.moves) vals.push(get_movement_attention(p.sn));
      if (opts.single) vals.push(get_single_attention(p.sn));
      vals = mean_map(vals);
      p.svis.colorize_values(function(vals) { return function(on) { return vals[on.obj.id] }}(vals));
    } else if (d.name == 'uniqueness') {
      var vals = [];
      if (opts.shape) vals.push(get_uniqueness(group_by_shape(p.sn.objs)));
      if (opts.size) vals.push(get_uniqueness(group_by_attributes(p.sn.objs, ['small', 'large'])));
      if (opts.moves) vals.push(get_uniqueness(group_by_attributes(p.sn.objs, ['moves'])));
      if (opts.spatial) vals.push(get_uniqueness(group_by_distance(p.sn)));
      vals = mean_map(vals);
      p.svis.colorize_values(function(vals) { return function(on) { return vals[on.obj.id] }}(vals));
    }
  }
}

var group_by_shape = function(objs) {
  var res = group_by_attributes(objs, ['shape']);
  if (res.rectangle || res.triangle || res.square) {
    res.angular = {};
    ['rectangle', 'square', 'triangle'].forEach(function (s) {
      if (s in res) {
        res.angular[s] = res[s];
        delete res[s];
      }
    });
  }
  return res;
}

var group_by_distance = function(sn, max_dist) {
  if (typeof(max_dist) === 'undefined') max_dist = 0.06;
  var sg = sn.oracle.getSpatialGroups(max_dist);
  var res = {};
  for (var i=0; i<sg.length; i++) res[i] = sg[i].map(function(body) { return body.master_obj });
  return res;
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

/// Returns an associative array with the same keys as the first passed map and the values
/// set to the mean of the mean value all arguments values for that key.
/// Example:
///  m_m([{a:1, b:3}, {a:3, b:-3}]) ==> {a:2, b:0}
function mean_map(maps) {
  if (!maps.length) return {};
  var res = {}, keys = d3.keys(maps[0]);
  for (var i=0; i<keys.length; i++) {
    res[keys[i]] = 0;
    for (var j=0; j<maps.length; j++) res[keys[i]] += maps[j][keys[i]] / maps.length;
  }
  return res;
}

function get_movement_attention(sn) {
  var sum=0, res = {};
  for (var i=0; i<sn.objs.length; i++) {
    var val = 0;
    if (sn.objs[i].get('moves').get_activity()>=0.5) val = 100;
    else if (sn.objs[i].get('stability').get_label() == 'unstable') val = 50;
    sum += val;
    res[sn.objs[i].obj.id] = val;
  };
  if (sum > 0) for (var id in res) res[id] /= sum *0.01;
  return res;
}

/// All attention on the top-most object and vertically close objects (using the
/// membership function of the CloseRelationship on 2.5 times the vertical distance).
function get_top_attention(sn) {
  var sum=0, res={}
  for (var i=0; i<sn.objs.length; i++) {
    var val = sn.objs[i].get('top_most').get_activity();
    sum += val;
    res[sn.objs[i].obj.id] = val;
  };
  if (sum > 0) for (var id in res) res[id] /= sum *0.01;
  return res;
}

/// All attention on the objects that are singled out spatially.
var get_single_attention = function(scene) {
  var g = scene.oracle.getSpatialGroups(0.06);
  var sum=0, res={}
  for (var i=0; i<g.length; i++) {
    if (g[i].length != 1) g[i].forEach(function (on) { res[on.master_obj.id] = 0 });
    else {
      res[g[i][0].master_obj.id] = 1;
      sum++;
    }
  }
  if (sum > 0) for (var id in res) res[id] /= sum *0.01;
  return res;
}

/// Inverses the values and keys of the passes associative array, but uses ids as new keys and
/// successive numbers as values. For nested arrays just considers the leaves.
/// Example:
///   {angular: {square: [o1], recangle: [o2, o3]}, circle: [o4]} ==> {1: 0, 2: 1, 3: 1, 4: 2}
function inverse_aa(aa) {
  var res = {}, idx=0;
  var f = function(aa) {
    if (Array.isArray(aa)) {
      for (var i=0; i<aa.length; i++) res[aa[i].id] = idx;
      idx++;
    } else {
      var arr = d3.values(aa);
      for (var i=0; i<arr.length; i++) f(arr[i]);
    }
  }
  f(aa);
  return res;
}

function get_move_saliency(sn) {
  var hg = group_by_attr(sn.objs, 'moves');
  return get_uniqueness(hg);
}

function get_size_saliency(sn) {
  var hg = group_by_attrs(sn.objs, ['small', 'large']);
  return get_uniqueness(hg);
}

function get_shape_saliency(sn) {
  var hg = group_by_multivalued_attr(sn.objs, 'shape');
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

/// Returns an associative array with the names of the attributes with highest activation as
/// keys and an array of objects as values. Pass an array of objects and an array of attribute
/// names and optionally a minimum activity required for an attribute to be active (default 0.5).
/// If no attribute is active, the object is sorted into an '_none_' key. This function
/// works for single-valued attributes (like small) and multi-valued attributes (like shape).
/// Example calls:
///   g_b_a([o1,o2,o3], ['shape']) ==> {'rectangle': [o1], 'square': [o2], '_none_': [o3]}
///   g_b_a([o1,o2,o3], ['small', 'large']) ==> {'small': [o1], 'large': [o2,o3]}
function group_by_attributes(objs, attrs, min_activity) {
  var res = {};
  if (typeof min_activity == 'undefined') min_activity = 0.5;
  for (var i=0; i<objs.length; i++) {
    var max_act = min_activity, max_attr = '_none_';
    for (var j=0; j<attrs.length; j++) {
      var attr = objs[i].getAttr(attrs[j]);
      var act = attr.get_activity();
      if (act >= max_act) {
        max_act = act;
        max_attr = attr.get_label();
      }
    }
    if (!(max_attr in res)) { res[max_attr] = [] }
    res[max_attr].push(objs[i].obj);
  }
  return res;
}

/// Pass a (nested) associative array with to get an hash that holds the uniqueness value
/// (in [0, 100]) for each node's id.
/// Example:
///   {small: [o1], large: [o2, o3]} ==> {1: 50, 2: 25, 3: 25}
///   {angular: {square: [o1], recangle: [o2, o3]}, circle: [o4]} ==> {1: 25, 2: 12.5, 3: 12.5, 4: 50}
function get_uniqueness(arr) {
  var res = {};
  var f = function(X, factor) {
    if (Array.isArray(X)) {
      for (var i=0; i<X.length; i++) res[X[i].id] = Math.round(factor/X.length);
    } else {
      var arr = d3.values(X);
      for (var i=0; i<arr.length; i++) {
        f(arr[i], factor/arr.length);
      }
    }
  }
  f(arr, 100);
  return res;
}
