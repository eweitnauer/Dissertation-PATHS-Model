/// The workspace is a container for all objects the interpreter works with
/// and has some utility functions for accessing them.
var Workspace = function(scenes, options, log_level) {
  this.scenes = scenes;
  this.left_scenes = scenes.filter(function(sn) { return sn.side == 'left'});
  this.right_scenes = scenes.filter(function(sn) { return sn.side == 'right'});

  this.options = options;

  this.perception_count = 0;
  this.retrieval_count = 0;
  this.register_events();

  this.solutions = []; // will hold all correct solutions that were found

  this.log_level = {debug: 4, info: 3, warn: 2, error: 1, no: 0}[log_level || 'no'];
  this.log_symbol = {1: 'EE', 2: 'WW', 3: 'II', 4: 'DB'};
  this.step = 1;

  this.scene_pair_sequence = this.generateSceneSequence();
  this.scene_pair_index = 0;
  this.scene_pair_steps = 0;
  this.active_scene_pair = this.scene_pair_sequence[0];

  this.attentionNet = new AttentionNet();
  this.initAttentionNet();
  this.coderack = new Coderack(this);

  this.logCallback = null;
}

Workspace.prototype.generateSceneSequence = function() {
  var seqs8 = { 'interleaved-sim-sim': ['A1B1', 'A2B2', 'A3B3', 'A4B4', 'A5B5', 'A6B6', 'A7B7', 'A8B8']  // wip: 8 bwp: 4 | wic: 8 bwc: 4
              , 'interleaved-sim-dis': ['A1B1', 'A3B3', 'A5B5', 'A7B7', 'A2B2', 'A4B4', 'A6B6', 'A8B8']  // wip: 8 bwp: 0 | wic: 0 bwc: 8
              , 'interleaved-dis-sim': ['A1B3', 'A2B4', 'A3B5', 'A4B6', 'A5B7', 'A6B8', 'A7B1', 'A8B2']  // wip: 0 bwp: 4 | wic: 4 bwc: 0
              , 'interleaved-dis-dis': ['A1B3', 'A5B7', 'A4B2', 'A8B6', 'A3B1', 'A7B5', 'A2B4', 'A6B8']  // wip: 0 bwp: 0 | wic: 0 bwc: 0
              , 'blocked-sim-sim': ['A1A2', 'B1B2', 'A3A4', 'B3B4', 'A5A6', 'B5B6', 'A7A8', 'B7B8']      // wip: 8 bwp: 4 | wic: 8 bwc: 4
              , 'blocked-sim-dis': ['A1A2', 'B3B4', 'A5A6', 'B7B8', 'A3A4', 'B1B2', 'A7A8', 'B5B6']      // wip: 8 bwp: 0 | wic: 8 bwc: 0
              , 'blocked-dis-sim': ['A1A3', 'B1B3', 'A2A4', 'B2B4', 'A5A7', 'B5B7', 'A6A8', 'B6B8']      // wip: 0 bwp: 6 | wic: 0 bwc: 6
              , 'blocked-dis-dis': ['A1A5', 'B3B7', 'A6A2', 'B8B4', 'A7A3', 'B5B1', 'A4A8', 'B2B6']};    // wip: 0 bwp: 2 | wic: 0 bwc: 2
  var lsn = this.left_scenes, rsn = this.right_scenes;
  return seqs8[this.options.pres_mode].map(function(str) {
    return [(str[0] === 'A' ? lsn : rsn)[+str[1]-1]
           ,(str[2] === 'A' ? lsn : rsn)[+str[3]-1]];
  });
}

Workspace.prototype.advanceScenePair = function() {
  this.scene_pair_steps = 0;
  this.scene_pair_index = (this.scene_pair_index+1) % this.scene_pair_sequence.length;
  this.active_scene_pair = this.scene_pair_sequence[this.scene_pair_index];
}

Workspace.prototype.perceived_feature = function(event) {
  this.perception_count++;
  if (event.percept.arity === 1) {
    this.log(3, 'perceived', event.percept.key
                 , '(t=' + event.time + ') on'
                 , this.getDescription(event.target) + ':'
                 , event.percept.get_activity());
    this.log(4, event.target, event.percept);

    var d_att = this.options.attention.obj.attr_boost[event.percept.key];
    if (d_att && (event.time === 'start' || event.percept.constant) ) {
      this.changeAttention(event.target, d_att*event.percept.get_activity());
    }
  } else if (event.percept.arity === 2) {
    var d_att = this.options.attention.obj.rel_boost[event.percept.key];
    if (d_att && (event.time === 'start' || event.percept.constant)) {
      this.changeAttention(event.target, d_att[0]*event.percept.get_activity());
      this.changeAttention(event.other, d_att[1]*event.percept.get_activity());
    }
    this.log(3, 'perceived', event.percept.key
             , '(t=' + event.time + ') on'
             , this.getDescription(event.target), 'and'
             , this.getDescription(event.other) + ':'
             , event.percept.get_activity());
    this.log(4, event.target, event.other, event.percept);
  }
}

Workspace.prototype.retrieved_feature = function() {
  this.retrieval_count++;
}

Workspace.prototype.register_events = function() {
  var thiz = this;
  for (var i=0; i<this.scenes.length; i++) {
    var sn = this.scenes[i];
    for (var j=0; j<sn.objs.length; j++) {
      sn.objs[j].off('perceived');
      sn.objs[j].off('retrieved');
      sn.objs[j].on('perceived', thiz.perceived_feature.bind(thiz));
      sn.objs[j].on('retrieved', thiz.retrieved_feature.bind(thiz));
    }
  }
}

Workspace.prototype.initAttentionNet = function() {
  var aNet = this.attentionNet, options = this.options;

  var blank_sol = new Solution(new Selector(), 'both');
  aNet.addSolution(blank_sol);

  this.scenes.forEach(function (sn) {
    sn.objs.forEach(function (on) { aNet.addObject(on, options.attention.obj.initial) });
  });

  options.features.forEach(function (info) {
    aNet.addFeature(info.klass, info.initial_activation);
  });
}

Workspace.prototype.changeAttention = function(thing, delta, min, max) {
  var self = this;
  if (thing instanceof Solution) {
    this.attentionNet.addToAttentionValue(thing, delta, min || 0, max || 1);
    this.spreadAttentionFromHypothesisToFeatures(thing, delta);
  } else if (thing instanceof GroupNode) {
    var N = thing.objs.length;
    thing.objs.forEach(function(obj) {
      self.attentionNet.addToAttentionValue(obj.object_node, delta, min, max);
    });
  } else if (thing instanceof ObjectNode) {
    self.attentionNet.addToAttentionValue(thing, delta, min, max);
  } else { // should be a feature
    self.attentionNet.addToAttentionValue(thing, delta, min, max);
  }
}

Workspace.prototype.getAttention = function(thing) {
  return this.attentionNet.getAttentionValue(thing);
}

Workspace.prototype.getHypothesisInfoArray = function() {
  var self = this;
  return this.attentionNet.solutions.map(function(sol) {
    return { val: self.attentionNet.getAttentionValue(sol)
           , sol: sol.describe()
           , src: sol }
  });
}

Workspace.prototype.getFeatureInfoArray = function() {
  var self = this;
  return this.attentionNet.features.map(function(feature) {
    return { key: feature.prototype.key
           , val: self.attentionNet.getAttentionValue(feature)};
  });
}

Workspace.prototype.log = function(level) {
  if (this.log_level < level) return;
  var lvl = level;
  level = (level === 3 ? '' : this.log_symbol[level])
        + '[' + this.step + ']';
  if (this.logCallback) {
    var msg = Array.prototype.join.call(arguments, ' ');
    this.logCallback(msg);
  } else {
    if (lvl == 1) console.error.apply(console, arguments);
    else if (lvl == 2) console.warn.apply(console, arguments);
    else if (lvl == 3) console.info.apply(console, arguments);
    else console.log.apply(console, arguments);
  }
}

// TODO: attention net should handle this later (maybe)
Workspace.prototype.getRandomTime = function() {
  var options = this.options;
  return Random.pick_weighted(['start', 'end'], function(el) {
    return options.attention.time[el];
  });
}

// TODO: implement an attention shifting algorithm that shifts
// attention from old to new scenes slowly over time.
Workspace.prototype.getActiveScenePair = function() {
  return this.active_scene_pair;
}

/// Available options: type ('obj' or 'group'), filter (Feature->bool)
Workspace.prototype.getRandomFeature = function(options) {
  return this.attentionNet.getRandomFeature(options);
}

Workspace.prototype.getRandomHypothesis = function(options) {
  return this.attentionNet.getRandomSolution(options);
}

/// Returns true if the solution was new and inserted.
Workspace.prototype.addHypothesis = function(sol, val) {
  if (arguments.length === 1) val = 1.0;
  if (this.attentionNet.addSolution(sol, val)) {
    this.log(3, 'added solution hypothesis', sol.describe());
    this.spreadAttentionFromHypothesisToFeatures(sol, val);
    return true;
  }
  return false;
}

Workspace.prototype.spreadAttentionFromHypothesisToFeatures = function(sol, val) {
  var options = this.options;
  var self = this;
  if (options.attention.feature.from_sel) {
    var N = sol.sel.featureCount();
    sol.sel.forEachFeature(function(feature) {
      var old_val = self.attentionNet.getAttentionValue(feature);
      if (old_val === 0) return;
      self.changeAttention(feature, val *options.attention.feature.from_sel / N, 0.01, 1);
    });
  }
}

/// Sets the attention value of the passed solution to 0 so it is
/// never choosen again by the attention net but is still there so it
/// won't be added again.
Workspace.prototype.blockHypothesis = function(sol) {
  this.log(3, 'blocking solution hypothesis', sol.describe());
  var old_val = this.attentionNet.getAttentionValue(sol);
  this.attentionNet.setAttentionValue(sol, 0);
  this.spreadAttentionFromHypothesisToFeatures(sol, -old_val*0.5);
}

Workspace.prototype.blockFeature = function(feature) {
  this.log(3, 'blocking feature', feature.prototype.key);
  this.attentionNet.setAttentionValue(feature, 0);
}


Workspace.prototype.addSolution = function(sol) {
  this.solutions.push(sol);
  this.log(3, 'adding solution:', sol.describe());
}

Workspace.prototype.getGroupBySelector = function(sel, scene) {
  for (var i=0; i<scene.groups.length; i++) {
    var g = scene.groups[i];
    if (g.selectors.indexOf(sel) !== -1) return g;
  }
  return null;
}

Workspace.prototype.arraysIdentical = function(a1, a2) {
  if (a1.length !== a2.length) return false;
  for (var i=0; i<a1.length; i++) {
    if (a2.indexOf(a1[i]) === -1) return false;
  }
  return true;
}

/// Will not create an empty group (from a non-matching selector) but return
/// null is this case.
Workspace.prototype.getOrCreateGroupBySelector = function(sel, scene) {
  if (!scene) throw "missing scene argument";
  var group = this.getGroupBySelector(sel, scene);
  if (group) return group;
  // no group has this selector associated, look if there is a group with the
  // same objects in it as the selector would select
  group = sel.applyToScene(scene);
  if (group.empty()) return null;
  for (var i=0; i<scene.groups.length; i++) {
    if (this.arraysIdentical(scene.groups[i].objs, group.objs)) {
      if (scene.groups[i].selectors.some(function(ssel) { return ssel.equals(sel) })) {
        throw "about to insert double selector";
      }
      scene.groups[i].selectors.push(sel);
      return scene.groups[i];
    }
  }
  // a new group!
  scene.groups.push(group);
  return group;
};

/// Selects a random group from the passed scene based on the attention values
/// of the respective group selectors. Returns null if no group could be selected.
/// Options: not_empty (bool), filter (GroupNode->bool)
Workspace.prototype.getRandomGroup = function(scene, options) {
  options = options || {};
  var aNet = this.attentionNet;
  var self = this;
  // get groups through selectors
  var hyp = this.getRandomHypothesis({filter: function(hyp) {
    var group = self.getOrCreateGroupBySelector(hyp.sel, scene);
    return (group && (!options.filter || options.filter(group)));
  }});
  if (!hyp) return null;
  return this.getGroupBySelector(hyp.sel, scene);
}

Workspace.prototype.getRandomScene = function() {
  return Random.pick(this.getActiveScenePair());
}

/// You may pass a filter function in the options (ObjectNode->bool).
Workspace.prototype.getRandomObject = function(scene, options) {
  if (typeof(scene) == 'undefined') scene = this.getRandomScene();
  return this.attentionNet.getRandomObject(scene, options);
}

/// Pass an object or group node.
Workspace.prototype.getDescription = function(thing) {
  if (thing instanceof ObjectNode) {
    return thing.scene_node.id+":Obj"+thing.obj.id;
  } else if (thing instanceof GroupNode) {
    return thing.scene_node.id+":Grp";
  }
}

Workspace.prototype.describe = function() {
  this.coderack.describe();
}