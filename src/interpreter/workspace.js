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

  this.events = d3.dispatch('switched_scenes');

  this.scene_pair_sequence = this.generateSceneSequence();
  this.scene_pair_index = 0;
  this.scene_pair_steps = 0;
  this.active_scene_pair = this.scene_pair_sequence[0];

  this.attentionNet = new AttentionNet(this.options);
  anet = this.attentionNet;
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
  this.events.switched_scenes();
}

Workspace.prototype.perceived_feature = function(event) {
  this.perception_count++;
  this.log_perception('perceived', event, 3);
}

Workspace.prototype.retrieved_feature = function(event) {
  this.retrieval_count++;
  this.log_perception('retrieved', event, 4);
}

Workspace.prototype.log_perception = function(type, event, log_level) {
  if (event.percept.arity === 1) {
    this.log(log_level, type, event.percept.key
                 , '(t=' + event.time + ') on'
                 , this.getDescription(event.target) + ':'
                 , event.percept.get_activity());
  } else if (event.percept.arity === 2) {
    this.log(log_level, type, event.percept.key
             , '(t=' + event.time + ') on'
             , this.getDescription(event.target), 'and'
             , this.getDescription(event.other) + ':'
             , event.percept.get_activity());
  }
}

/// Pass an array of object or scene nodes to setup the perceived and retrieved
/// listeners. If called without argument, all object nodes will be registered.
Workspace.prototype.register_events = function() {
  ObjectNode.events.on('perceived', this.perceived_feature.bind(this));
  ObjectNode.events.on('retrieved', this.retrieved_feature.bind(this));
  GroupNode.events.on('perceived', this.perceived_feature.bind(this));
  GroupNode.events.on('retrieved', this.retrieved_feature.bind(this));
}

Workspace.prototype.initAttentionNet = function() {
  var aNet = this.attentionNet, options = this.options;

  var blank_sol = new Solution(new Selector(), 'both');
  this.addHypothesis(blank_sol);
  this.blank_hypothesis = blank_sol;

  this.scenes.forEach(function (sn) {
    sn.objs.forEach(function (on) { aNet.addObject(on) });
    blank_sol.sel.applyToScene(sn); // create the all group so there is at least
                                    // one group on which group attributes can be
                                    // perceived
  });

  options.features.forEach(function (info) {
    info.klass.prototype.apriori = info.initial_activation;
    aNet.addFeature(info.klass, info.group, 1/options.features.length);
  });

  aNet.updateActivities();
}

Workspace.prototype.getAttention = function(thing) {
  return this.attentionNet.getActivity(thing);
}

Workspace.prototype.getHypothesisInfoArray = function() {
  var self = this;
  return this.attentionNet.solutions.map(function(sol) {
    return { val: self.attentionNet.getActivity(sol)
           , sol: sol.describe()
           , src: sol }
  });
}

Workspace.prototype.getFeatureInfoArray = function() {
  var self = this;
  return this.attentionNet.features.map(function(feature) {
    return { key: feature.prototype.key
           , val: self.attentionNet.getActivity(feature)
           , src: feature };
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
    return options.activity.time[el];
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
Workspace.prototype.addHypothesis = function(hyp) {
  if (!this.isNewHypothesis(hyp)) return false;
  this.attentionNet.addSolution(hyp);
  hyp.sel.solution = hyp;
  this.log(3, 'added solution hypothesis', hyp.describe());
  return true;
}

Workspace.prototype.isNewHypothesis = function(hyp) {
  return this.attentionNet.solutions.every(function (other) {
    return !other.sel.equals(hyp.sel) // we ignore the solution mode
  });
}

Workspace.prototype.addSolution = function(sol) {
  // do a safety check
  if (!sol.check(this.left_scenes.slice(0,8), this.right_scenes.slice(0,8))) {
    console.error('This "solution" is not valid:', sol.describe());
    console.error(sol);
    throw "this aint no solution!";
  }
  this.solutions.push(sol);
  this.log(3, 'adding solution:', sol.describe());
}

/// Selects a random group from the passed scene based on the attention values
/// of the respective group's selectors. Returns null if no group could be
/// selected. Options: filter (GroupNode->bool)
Workspace.prototype.getExistingRandomGroup = function(scene, options) {
  var group_pool = scene.groups;
  if (options && options.filter) group_pool = group_pool.filter(options.filter);
  var sel_pool = [];
  group_pool.forEach(function(group) { sel_pool = sel_pool.concat(group.selectors) });

  var hyp = this.getRandomHypothesis({filter: function(hyp) {
    return sel_pool.indexOf(hyp.sel) !== -1;
  }});
  var res = null;
  if (hyp) res = hyp.sel.getCachedResult(scene);
  return res;
}

/** Selects a group based on a randomly chosen hypothesis.
 * SIDE EFFECTS: Will perceive all existing hypotheses on the passed scene,
 * creating the respective groups if they don't exist in the scene, yet. */
Workspace.prototype.getAnyRandomGroup = function(scene, options) {
  options = options || {};
  var aNet = this.attentionNet;
  var self = this;
  // get groups through selectors
  var hyp = this.getRandomHypothesis({filter: function(hyp) {
    var group = hyp.sel.applyToScene(scene);
    return (group && (!options.filter || options.filter(group)));
  }});
  if (!hyp) return null;
  return hyp.sel.getCachedResult(scene);
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
