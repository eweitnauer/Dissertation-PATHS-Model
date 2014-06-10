// Copyright Erik Weitnauer, 2013.

/** I want to compute a score for how well two objects from different scenes match.
What I will compare:
  - how many attributes match
  - are they the same part of a relation match?
  - how spatially close are they to each other?
What I will need:
  - what attributes should I look at?
  - how should I weight the different attributes?
*/

/// Will return a value between 0 and 1 representing how well the two objects match.
/// opts have three fields: attrs, spatial and time
/// attrs looks like {shape: 1, size: 2.5, ...}
var getSimilarity = function(on1, on2, opts) {
	var res = 0;
	var wsum = 0;
	for (var key in opts.attrs) {
		var a1 = on1.get(key, {time: opts.time}), a2 = on2.get(key, {time: opts.time});
		if (a1.get_label() == a2.get_label()) {
			res += (1-Math.abs(a1.get_activity() - a2.get_activity())) * opts.attrs[key];
		}
		wsum += opts.attrs[key];
	}
	if (opts.spatial && opts.spatial > 0) {
		res += on1.get('close', {other: on2, time: opts.time}).get_activity() * opts.spatial;
		wsum += opts.spatial;
	}
	res = res/wsum;
	return res;
}

/// Returns a value between 0 and 1 representing the likeliness of the passed object
/// being the key object of the scene.
/// Factors:
///   - number of objects in the scene
///   - does the object move?
///   - how well does the object stand out spatially?
///   - how well does the object stand out in its attributes?
///   - can we find good analogous objects in the other scenes?
/// opts has three possible fields: attrs, odd_attrs and time

/** For testing:
scenes = []; for (p in problems) scenes.push(problems[p].sn);
getKeyness(problems['1-1'].sn.objs[0], scenes
          ,{attrs: {moves: 0}, odd_attrs: {spatial:0, shape:0}, analogy: 100, time:'start'}
          ,{attrs: {small: 100, shape: 100, top_most:0, stability:10000}, spatial: 100, time: 'start'})
*/
var getKeyness = function(on, scenes, opts, sim_opts) {
	var res = 0, weight_sum = 0;
	if (opts.attrs) for (var attr in opts.attrs) {
		res += on.get(attr, {time: opts.time}).get_activity() * opts.attrs[attr];
		weight_sum += opts.attrs[attr];
	}
	if (opts.odd_attrs) for (var attr in opts.odd_attrs) {
		var g;
		if (attr == 'spatial') {
			g = group_by_distance(on.scene_node.objs, on.scene_node);
		} else if (attr == 'shape') {
			g = group_by_shape(on.scene_node.objs);
		} else {
			g = group_by_attributes(on.scene_node.objs, [attr]);
		}
		res += get_uniqueness(g)[on.obj.id] / 100 * opts.odd_attrs[attr];
		weight_sum += opts.odd_attrs[attr];
	}
	if (opts.analogy) {
		res += getBestAnalogy(on, scenes, sim_opts).avg_sim * opts.analogy;
		weight_sum += opts.analogy;
	}
	return res / weight_sum;
}

/// Returns an object {ons: [], avg_sim: Number}
/** Use this code for testing on PBP solutions site:
sn = problems['1-1'].sn;
scenes = []; for (p in problems) scenes.push(problems[p].sn);
vis = []; for (p in problems) vis.push(problems[p].svis);
on = sn.objs[0];
res = getBestAnalogy(on, scenes, {attrs: {small: 100, shape: 100, top_most:0, stability:10000}, spatial: 100, time: 'start'})
res.ons.unshift(on);
for (var i=0; i<20; i++) { vis[i].selectShapes([res.ons[i].obj])};
*/
var getBestAnalogy = function(on, scenes, sim_opts) {
	var sum = 0, ons = [];
	for (var i=0; i<scenes.length; i++) {
		var sn = scenes[i];
	  if (sn.objs.indexOf(on) != -1) continue;
	  var best = 0, best_idx = 0;
	  for (var j=0; j<sn.objs.length; j++) {
	    var sim = getSimilarity(on, sn.objs[j], sim_opts);
	    if (sim > best) {
	    	best = sim;
	    	best_idx = j;
	    }
	  }
	  sum += best;
	  ons.push(sn.objs[best_idx]);
	}
	return {ons: ons, avg_sim: sum/ons.length};
}