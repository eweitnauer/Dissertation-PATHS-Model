/* jshint laxcomma: true, asi: true */
var PI = PI || {};

/*

Version 0.4.2
- TODO: we don't use solution codelets anymore. Instead, we keep track of which
left and right scenes each selector fits and if they all fit, its a solution!

Version 0.4.1
- shifting attention between scenes in a fixed scheme
- fixed a-priori probabilities for looking at start and end time
- instead of scaling to normalize attention values, we simply clamp them now
- don't set attention values directly, but only increase / decrease them in steps
- cooldown for all attention values

Version 0.4.0
- adding in attention mechanism for selectors:
  - initialize with attention value based on number of scenes matching
- adding in attention mechanism for objects:
  - spread attention from selectors to selected objects
  - add attention to objects with certain attributes (like moves)
  - add attention to objects in certain relationships (like hits)
  - spread attention from selectors to used features


PBP  2: [CountAttribute]
PBP  4: [ShapeAttribute]
PBP  8: [StabilityAttribute]
PBP 11: [CloseAttribute]
PBP 12: [OnTopRelationship, SmallAttribute]
PBP 13: [CountAttribute, OnGroundAttribute]
PBP 16: [RightRelationship, LeftRelationship, ShapeAttribute]
PBP 18: [TouchAttribute, TouchRelationship]
PBP 20: [SupportsRelationship, ShapeAttribute]
PBP 22: [HitsRelationship, CollidesRelationship]
PBP 26: [ShapeAttribute, LeftAttribute]
PBP 31: [MovableUpAttribute, ShapeAttribute]
*/

PI.v0_4_2 = (function() {
  var version = '0.4.2';

  var options = {
    features: [ CountAttribute, CircleAttribute, SquareAttribute, StabilityAttribute, CloseAttribute
              , OnTopRelationship, SmallAttribute, SingleAttribute, MovesAttribute,
              , OnGroundAttribute, RightRelationship, LeftRelationship
              , TouchAttribute, TouchRelationship, SupportsRelationship
              , HitsRelationship, CollidesRelationship, LeftAttribute, RightAttribute
              , TopMostAttribute, MovableUpAttribute]//, SquareAttribute, RectangleAttribute, TriangleAttribute, LeftAttribute, RightAttribute]//[RightRelationship, LeftRelationship, ShapeAttribute, CountAttribute, OnGroundAttribute]
  , pres_mode: 'interleaved-sim-sim' // {blocked, interleaved} X {sim, dis} X {sim, dis}
  , pres_time: 100 // every x steps, switch to the next scene pair
  , attention:
    { time: { start: 0.67, end: 0.33 }
    , sel: {
        initial: 0.1 // new selectors start with this attention value
      , single: 0.3  // raise attention to selectors that match only a single objects per scene
      , match:  // raise attention according to which scenes where matched in a scene pair
        {
          same_side:
          {
            matched_0: { obj_sel:  0  , grp_sel: 0 }
          , matched_1: { obj_sel: -0.3, grp_sel: 0 }
          , matched_2: { obj_sel:  0.1, grp_sel: 0.1 }
          }
        , both_sides:
          {
            matched_0: { obj_sel: -0.3, grp_sel: 0 }
          , matched_1: { obj_sel:  0.2, grp_sel: 0.2 }
          , matched_2: { obj_sel: -0.1, grp_sel: 0 }
          }
        }
      }
    , feature: {
        initial: 0.1
      , from_sel: 0.5 // scale that is applied when spreading attention from new selectors to features
    }
    , obj: {
        initial: 0.1
      , from_sel: 1.0 // scale that is applied when spreading attention from new selectors to objects
      , attr_boost: { // only apply at time "start"
          moves: 0.3
        , top_most: 0.1 // often will get boosted via sel.single, too
        , left_most: 0.1
        , right_most: 0.1
        }
      , rel_boost: { // only apply at time "start"
          hits: [0.2, 0]
        , collides: [0.1, 0.1]
        }
      }
    }
  };

  /// The workspace is a container for all objects the interpreter works with
  /// and has some utility functions for accessing them.
  var Workspace = function(scenes, log_level) {
    this.scenes = scenes;
    this.left_scenes = scenes.filter(function(sn) { return sn.side == 'left'});
    this.right_scenes = scenes.filter(function(sn) { return sn.side == 'right'});

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

    this.coderack.behaviors.push(new MainBehavior(this.coderack));

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
    return seqs8[options.pres_mode].map(function(str) {
      return [(str[0] === 'A' ? lsn : rsn)[+str[1]-1]
             ,(str[2] === 'A' ? lsn : rsn)[+str[3]-1]];
    });
  }

  Workspace.prototype.advanceScenePair = function() {
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

      var d_att = options.attention.obj.attr_boost[event.percept.key];
      if (d_att && (event.time === 'start' || event.percept.constant) ) {
        this.changeAttention(event.target, d_att*event.percept.get_activity());
      }
    } else if (event.percept.arity === 2) {
      var d_att = options.attention.obj.rel_boost[event.percept.key];
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
    var aNet = this.attentionNet;
    this.scenes.forEach(function (sn) {
      sn.objs.forEach(function (on) { aNet.addObject(on, options.attention.obj.initial) });
    });

    aNet.addSelector(new Selector());
    options.features.forEach(function (feature) { aNet.addFeature(feature, options.attention.sel.initial) });
  }

  Workspace.prototype.changeAttention = function(thing, delta, min, max) {
    var self = this;
    if (thing instanceof Selector) {
      this.attentionNet.addToAttentionValue(thing, delta, min || 0, max || 1);
      this.spreadAttentionFromSelectorToFeatures(thing, delta);
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

  Workspace.prototype.getSelectorInfoArray = function() {
    var self = this;
    return this.attentionNet.selectors.map(function(sel) {
      return { val: self.attentionNet.getAttentionValue(sel)
             , sel: sel.describe()
             , src: sel }
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
    return Random.pick_weighted(['start', 'end'], function(el) {
      return options.attention.time[el];
    });
  }

  // TODO: implement an attention shifting algorithm that shifts
  // attention from old to new scenes slowly over time.
  Workspace.prototype.getActiveScenePair = function() {
    return this.active_scene_pair;
  }

  Workspace.prototype.getRandomFeature = function() {
    return this.attentionNet.getRandomFeature();
  }

  Workspace.prototype.getRandomSelector = function(options) {
    return this.attentionNet.getRandomSelector(options);
  }

  /// Returns true if the selector was new and inserted.
  Workspace.prototype.addSelector = function(sel, val) {
    if (arguments.length === 1) val = 1.0;
    if (this.attentionNet.addSelector(sel, val)) {
      this.log(3, 'added selector', sel.describe());
      this.spreadAttentionFromSelectorToFeatures(sel, val);
      return true;
    }
    return false;
  }

  Workspace.prototype.spreadAttentionFromSelectorToFeatures = function(sel, val) {
    var self = this;
    if (options.attention.feature.from_sel) {
      sel.forEachFeature(function(feature) {
        var old_val = self.attentionNet.getAttentionValue(feature);
        if (old_val === 0) return;
        self.changeAttention(feature, val * options.attention.feature.from_sel, 0.01, 1);
      });
    }
  }

  /// Sets the attention value of the passed selector to 0 so it is
  /// never choosen again by the attention net but is still there so it
  /// won't be added again.
  /// TODO: reduce attention of connected nodes in the attention net
  Workspace.prototype.blockSelector = function(sel) {
    this.log(3, 'blocking selector', sel.describe());
    var old_val = this.attentionNet.getAttentionValue(sel);
    this.attentionNet.setAttentionValue(sel, 0);
    this.spreadAttentionFromSelectorToFeatures(sel, -old_val);
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
      if (g.selector.equals(sel)) return g;
    }
    return null;
  }

  Workspace.prototype.getOrCreateGroupBySelector = function(sel, scene) {
    if (!scene) throw "missing scene argument";
    var group = this.getGroupBySelector(sel, scene);
    if (group) return group;
    // group not in scene yet, create
    group = sel.applyToScene(scene);
    if (!group.empty()) scene.groups.push(group);
    return group;
  };

  // TODO: attention net should handle this later (maybe)
  Workspace.prototype.getRandomScene = function() {
    return Random.pick(this.getActiveScenePair());
  }

  Workspace.prototype.getRandomObject = function(scene) {
    if (typeof(scene) == 'undefined') scene = this.getRandomScene();
    return this.attentionNet.getRandomObject(scene);
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

  /// The coderack is an array of codelets. Insert new ones with insert().
  /// Call the step() method for running all behaviors and a random codelet
  /// chosen based on codelet urgency values.
  var Coderack = function(workspace) {
    this.max_length = 50;
    this.behaviors = [];
    this.followups = []; // these are done first and in order
    this.ws = workspace;
  }
  Coderack.prototype = [];

  Coderack.prototype.step = function() {
    this.ws.step++;
    if (this.followups.length === 0) this.runBehaviors();
    this.runCodelet();
    this.ws.attentionNet.clamp('all', 0.1, 1, 0.001);
  }

  /// Default urgency is 10. Urgency must be above 0.
  Coderack.prototype.insert = function(codelet, urgency) {
    codelet.urgency = urgency || 10;
    this.push(codelet);
    this.ws.log(4, 'inserted',codelet.describe(),'with urgency',codelet.urgency);
    // forget the oldest elements if we have too many
    if (this.length > this.max_length) {
      this.splice(0, this.max_length-this.length);
    }
  }

  Coderack.prototype.describe = function() {
    if (this.length === 0) return 'empty coderack';
    var typeMap = {};
    this.forEach(function (codelet) {
      var type = codelet.name;
      if (type in typeMap) typeMap[type]++;
      else typeMap[type] = 1;
    });
    var str=[];
    for (var type in typeMap) { str.push(type + ": " + typeMap[t]) }
    return 'coderack: ' + str.join(', ');
  }

  /// Select next codelet based on their urgencies.
  Coderack.prototype.select = function() {
    if (this.length === 0) return null;
    return Random.pick_weighted(this, function(c) { return c.urgency });
  };

  /// Select next codelet based on their urgencies.
  Coderack.prototype.select_and_remove = function() {
    if (this.length === 0) return null;
    var idx = Random.weighted(this.map(function(c) { return c.urgency }));
    return this.splice(idx, 1)[0];
  };

  Coderack.prototype.runBehaviors = function() {
    var thiz = this;
    this.behaviors.forEach(function(behavior) {
      thiz.ws.log(4, 'running', behavior.name);
      behavior.run();
    });
  }

  Coderack.prototype.runCodelet = function() {
    var cdl;
    if (this.followups.length > 0) {
      this.ws.log(4, 'running followup');
      cdl = this.followups.shift();
    } else {
      if (this.length===0) { this.ws.log(2, 'no codelet to run'); return false }
      cdl = this.select_and_remove();
    }
    this.ws.log(3, 'running', cdl.describe());
    var res = cdl.run();

    if (res && cdl.followup && cdl.followup.length > 0) {
      while (cdl.followup.length > 0) this.insert(cdl.followup.shift(), cdl.urgency);
    }
  }






  /// Will create Attr-, NewSelector-, RefineSelector-, and SolveCodelets. What is created
  /// next will depend on a "mindset" value: 0 is complete explore and 1 complete exploit
  /// behavior. For now it just creates one of the four codelet types with a preset and fixed
  /// probability.
  var MainBehavior = function(coderack, attrs) {
    this.cr = coderack;
    this.ws = coderack.ws;
    this.name = 'MainBehavior';
    this.mindset = 0.25;
    this.codelet_infos = [{klass: AttrCodelet, mindset: 0}
                         //,{klass: NewSelectorCodelet, mindset: 0.5} //TODO: this codelet need input data currently
                         ,{klass: CombineSelectorCodelet, mindset: 1}
                         ,{klass: SolutionCodelet, mindset: 1}];
  }

  MainBehavior.prototype.describe = function() {
    return 'mindset: ' + this.mindset;
  }

  MainBehavior.prototype.run = function() {
    if (this.cr.length > 0) return;
    var mindset = this.mindset;
    var mindset_fit = function (cinfo) { return 1-Math.abs(cinfo.mindset-mindset) };
    var codelet_info = Random.pick_weighted(this.codelet_infos, mindset_fit);
    this.cr.insert(new codelet_info.klass(this.cr));
  }


  /**
   * Chooses an object or a group of objects and then an attribute or
   * relationship which it perceives. It may spawn NewSelectorCodelets (with
   * the current attribute) and RefineSelectorCodelets (with the current
   * attribute and a different attribute the same object has).
   */
  var AttrCodelet = function(coderack) {
    this.coderack = coderack;
    this.followup = [];
    this.ws = this.coderack.ws;
    this.time = this.ws.getRandomTime();
  }

  AttrCodelet.prototype.describe = function() {
    return 'AttrCodelet';
  }

  AttrCodelet.prototype.spawnNewSelCodelet = function (percept, time) {
    this.coderack.insert(new NewSelectorCodelet(this.coderack, percept, time));
  };

  AttrCodelet.prototype.isActive = function(percept) {
    return percept.get_activity() > pbpSettings.activation_threshold;
  }

  AttrCodelet.prototype.perceiveAttr = function(target, feature) {
    var percept = target.getFromCache(feature.prototype.key, {time: this.time});
    if (!percept) percept = target.get(feature.prototype.key, {time: this.time});
    if (this.isActive(percept)) {
      this.spawnNewSelCodelet(percept, this.time);
    }
  }

  AttrCodelet.prototype.perceiveRel = function(scene, target_obj, feature) {
    if (scene.objs.length < 2) {
      this.ws.blockFeature(feature);
      return;
    }
    var other;
    do other = this.ws.getRandomObject(scene); while(other === target_obj);
    percept = target_obj.getFromCache(feature.prototype.key, {other: other, time: this.time});
    if (!percept) percept = target_obj.get(feature.prototype.key, {other: other, time: this.time});
    if (percept && percept.get_activity() > pbpSettings.activation_threshold) {
      this.spawnNewSelCodelet(percept, this.time);
    }
  }

  AttrCodelet.prototype.run = function() {
    var target;
    var feature = this.ws.getRandomFeature();
    var scene = this.ws.getRandomScene();
    if (feature.prototype.targetType == 'group') {
      sel = this.ws.getRandomSelector({type: 'object'});
      target = this.ws.getOrCreateGroupBySelector(sel, scene);
      if (target.empty()) return; // TODO: decrease selector attention
    } else if (feature.prototype.targetType == 'obj') {
      target = this.ws.getRandomObject(scene);
    } else throw "unknown target type";

    if (feature.prototype.arity == 1) this.perceiveAttr(target, feature);
    else if (feature.prototype.arity == 2) this.perceiveRel(scene, target, feature);
    else throw "only features with arity 1 or 2 are supported";
  }

  /**
   * Uses the passed attribute / relationship and side to create the
   * respective selector. Then it applies the selector to the currently active
   * scenes. If all scenes match or only the scenes of one side match, it adds
   * the selector to the global list of selectors.
   */
  var NewSelectorCodelet = function(coderack, percept_or_sel, time) {
    this.coderack = coderack;
    this.followup = [];
    this.ws = this.coderack.ws;
    if (percept_or_sel instanceof Selector) this.selector = percept_or_sel;
    else this.percept = percept_or_sel;
    this.time = time;
  }

  NewSelectorCodelet.prototype.describe = function() {
    if (this.selector) return 'NewSelectorCodelet(' + this.selector.describe() + ')';
    else return 'NewSelectorCodelet(' + this.percept.key + '=' + this.percept.val + ')';
  }

  NewSelectorCodelet.prototype.createAttrSel = function() {
    var time = this.percept.constant ? 'start' : this.time;
    return (new Selector()).use_attr(this.percept, time);
  }

  /**
   * We need to construct a selector that matches the target object of the
   * relationship. This is tough in general, so we'll just search through
   * all existing object selectors and pick one that matches the target object.
   * If none does, returns null.
   */
  NewSelectorCodelet.prototype.createRelSel = function() {
    var other = this.percept.other.object_node;
    var other_sel = this.ws.getRandomSelector({type: 'object'
      ,filter: function(sel) {
        return !sel.hasRelationships() && sel.matchesObject(other);
      }
    });
    if (!other_sel) return null;
    return (new Selector()).use_rel(other_sel, this.percept, this.time);
  }

  NewSelectorCodelet.prototype.getAttFromMatchResult = function
  (same_side, match_count, is_obj_sel) {
    var vals = options.attention.sel.match;
    if (!vals) return 0;
    vals = same_side ? vals.same_side : vals.both_sides;
    if (match_count === 0) vals = vals.matched_0;
    else if (match_count === 1) vals = vals.matched_1;
    else vals = vals.matched_2;
    return is_obj_sel ? vals.obj_sel : vals.grp_sel;
  }

  /**
   * Create selector with the passed percept and apply it to the current
   * scenes. Then add it to the active selectors if it matches all scenes
   * or just all scenes from one side.
   */
  NewSelectorCodelet.prototype.run = function() {
    var self = this;

    var sel = this.selector;
    if (!sel) {
      if (this.percept.arity === 1) sel = this.createAttrSel();
      else if (this.percept.arity === 2) sel = this.createRelSel();
      if (this.percept.group && !this.percept.group.selector.blank()) {
        this.ws.log(4, 'perceived group feature based on selector result');
        sel = sel.mergedWith(this.percept.group.selector);
      }
    }
    if (!sel) return;

    var scenes = this.ws.getActiveScenePair();
    var same_side = scenes[0].side === scenes[1].side;
    var is_obj_sel = sel.getType() === 'object';
    var all_single_objs = true;
    var sel_grps = [];
    var match_count = scenes.filter(function (scene) {
      var res_group = self.ws.getOrCreateGroupBySelector(sel, scene);
      sel_grps.push(res_group);
      all_single_objs = all_single_objs && res_group.objs.length === 1;
      return (!res_group.empty());
    }).length;


    if (this.ws.addSelector(sel, options.attention.sel.initial)) {
      var d_att = this.getAttFromMatchResult(same_side, match_count, is_obj_sel);
      if (options.attention.sel.single && all_single_objs)
        d_att += options.attention.sel.single;
      this.ws.changeAttention(sel, d_att);
      var sel_att = self.ws.getAttention(sel)
      if (options.attention.obj.from_sel) {
        sel_grps.forEach(function(group) {
          self.ws.changeAttention(group, sel_att * options.attention.obj.from_sel);
        });
      }
    }
  }

  /** Will pick two generalizing type selectors and combine them. */
  var CombineSelectorCodelet = function(coderack) {
    this.coderack = coderack;
    this.followup = [];
    this.ws = this.coderack.ws;
  }

  CombineSelectorCodelet.prototype.describe = function() {
    return 'CombineSelectorCodelet';
  }

  CombineSelectorCodelet.prototype.run = function() {
    var sel1 = this.ws.getRandomSelector({no_blank: true, filter:
      function(sel) { return (sel.type !== 'mixed') && sel.too_general }
    });
    if (!sel1) return;
    var sel2 = this.ws.getRandomSelector({no_blank: true, filter:
      function(sel) { return ((sel !== sel1) && (sel.type === sel1.type) && sel.too_general)  }
    });
    if (!sel2) return;
    var sel12 = sel1.mergedWith(sel2);
    if (sel12.equals(sel1) || sel12.equals(sel2)) return;

    this.ws.log(3, 'combining', sel1.describe(), 'and', sel2.describe());

    this.coderack.insert(new NewSelectorCodelet(this.coderack, sel12));
  }


  /**
   * Will try to find a solution based on this codelet's selector for
   * both sides and all solution modes.
   */
  var SolutionCodelet = function(coderack) {
    this.coderack = coderack;
    this.followup = [];
    this.ws = this.coderack.ws;
  }

  SolutionCodelet.prototype.describe = function() {
    return 'SolutionCodelet';
  }

  /**
   * Set the solution mode and applies the solution to both sides. If
   * successful, it calls the success_callback with the solution as argument.
   * Otherwise, it calls the fail_callback (if one was passed) with "too
   * specific" or "too general" as first argument. In the "too general" case,
   * a second bool paramenter is passed that is true if the the selector
   * matches all objects in all scenes (and therefore can be replaced with the
   * blank selector).
   */
  SolutionCodelet.prototype.runWithSolution = function(sol, sol_mode, success_callback, fail_callback) {
    sol.mode = sol_mode;

    var lscenes = this.ws.left_scenes
       ,rscenes = this.ws.right_scenes;

    var l_matched_objs_count = lscenes.map(sol.check_scene.bind(sol))
       ,r_matched_objs_count = rscenes.map(sol.check_scene.bind(sol))
       ,l_match_count = l_matched_objs_count.filter(function (n) { return n }).length
       ,r_match_count = r_matched_objs_count.filter(function (n) { return n }).length
       ,l_total_obj_count = lscenes.reduce(function (count, scene) { return count + scene.objs.length }, 0)
       ,r_total_obj_count = rscenes.reduce(function (count, scene) { return count + scene.objs.length }, 0)
       ,l_no_match = l_match_count === 0
       ,r_no_match = r_match_count === 0
       ,l_all_match = l_match_count == lscenes.length
       ,r_all_match = r_match_count == rscenes.length
       ,same_as_blank = l_all_match && r_all_match &&
                        l_matched_objs_count===l_total_obj_count &&
                        r_matched_objs_count===r_total_obj_count;

    if (l_no_match && r_all_match) { // right solution?
      return success_callback(sol.setMainSide('right'));
    }
    if (l_all_match && r_no_match) { // left solution?
      return success_callback(sol.setMainSide('left'));
    }
    if (!l_all_match && !r_all_match) { // matches too little -> reject
      if (fail_callback) return fail_callback("too specific");
    }
    if (fail_callback) fail_callback("too general", same_as_blank);
  }

  SolutionCodelet.prototype.run = function () {
    if (Math.random()<0.1) {
      this.ws.advanceScenePair();
    }
    return;


    var self = this;
    sels = this.ws.getSelectorInfoArray();
    var sel = this.ws.getRandomSelector({no_blank: true, filter: function(sel) {
      return !sel.too_general && !sel.too_specific;
    }});
    if (!sel) return;
    var sol = new Solution(sel);
    var found_sol = false;
    var addSolFn = function(sol) {
      self.ws.addSolution(sol);
      found_sol = true;
    }

    var is_group_sol = (sol.sels[sol.sels.length-1].getType() === 'group'
                     || sol.sels[sol.sels.length-1].getType() === 'mixed');
    var res = this.runWithSolution(sol, 'exists', addSolFn, function(reason, same_as_blank) {
      if (reason == 'too specific') {
        self.ws.blockSelector(sel);
      } else if (reason == 'too general') {
        sel.too_general = true;
        if (!is_group_sol) { // unique or all don't make sense for
          self.runWithSolution(sol, 'all', addSolFn);          // group based solutions
          self.runWithSolution(sol, 'unique', addSolFn);
        }
        if (same_as_blank) self.ws.blockSelector(sel);
      }
    });
  }

  return {Workspace: Workspace
         ,Coderack: Coderack
         ,version: version
         };
})();
