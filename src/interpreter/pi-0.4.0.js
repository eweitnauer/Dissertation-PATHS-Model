/* jshint laxcomma: true, asi: true */
var PI = PI || {};

/*
Version 0.4.0
- adding in attention mechanism for selectors:
  - initialize with attention value based on number of scenes matching
- adding in attention mechanism for objects:
  - spread attention from selectors to selected objects
  - add attention to objects with certain attributes (like moves)


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

PI.v0_4_0 = (function() {
  var version = '0.4.0';

  var options = {
    active_scenes: 'b/w-sim' // can be 'w/i-sim' or 'b/w-sim' or 'w/i-dis' or 'b/w-dis'
   ,features: [CollidesRelationship]//SingleAttribute, MovesAttribute, TopMostAttribute, CircleAttribute, SquareAttribute, RectangleAttribute, TriangleAttribute, LeftAttribute, RightAttribute]//[RightRelationship, LeftRelationship, ShapeAttribute, CountAttribute, OnGroundAttribute]
   ,attention:
    { sel: {
        single: true
      , match:  true
      }
    , obj: {
        from_sel:   true
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

    if (options.active_scenes == 'w/i-sim')
      this.activeScenes = [this.left_scenes[2], this.left_scenes[3]]; // FIXME: shift attetention between scenes
    else if (options.active_scenes == 'w/i-dis')
      this.activeScenes = [this.left_scenes[2], this.left_scenes[4]]; // FIXME: shift attetention between scenes
    else if (options.active_scenes == 'b/w-dis')
      this.activeScenes = [this.left_scenes[4], this.right_scenes[2]]; // FIXME: shift attetention between scenes
    else if (options.active_scenes == 'b/w-sim')
      this.activeScenes = [this.left_scenes[0], this.right_scenes[0]]; // FIXME: shift attetention between scenes

    this.attentionNet = new AttentionNet();
    this.initAttentionNet();
    this.coderack = new Coderack(this);

    this.coderack.behaviors.push(new MainBehavior(this.coderack));

    this.logCallback = null;
    this.attentionNet.normalize('objects');
    this.attentionNet.normalize('features');
  }

  Workspace.prototype.perceived_feature = function(event) {
    this.perception_count++;
    console.log(event);
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
      sn.objs.forEach(function (on) { aNet.addObject(on) });
    });

    aNet.addSelector(new Selector());
    options.features.forEach(function (feature) { aNet.addFeature(feature) });
  }

  Workspace.prototype.changeAttention = function(thing, delta) {
    var self = this;
    if (thing instanceof Selector) {
      this.attentionNet.addToAttentionValue(thing, delta, 0, 1);
    } else if (thing instanceof GroupNode) {
      var N = thing.objs.length;
      thing.objs.forEach(function(obj) {
        self.attentionNet.addToAttentionValue(obj.object_node, delta);
      });
    } else if (thing instanceof ObjectNode) {
      self.attentionNet.addToAttentionValue(thing, delta);
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
    if (lvl == 1) console.error.apply(console, arguments);
    else if (lvl == 2) console.warn.apply(console, arguments);
    else if (lvl == 3) console.info.apply(console, arguments);
    else console.log.apply(console, arguments);
    if (this.logCallback) {
      var msg = Array.prototype.join.call(arguments, ' ');
      this.logCallback(msg);
    }
  }

  // TODO: attention net should handle this later (maybe)
  Workspace.prototype.getRandomTime = function() {
    return Random.pick(['start', 'end']);
  }

  // TODO: implement an attention shifting algorithm that shifts
  // attention from old to new scenes slowly over time.
  Workspace.prototype.getActiveScenePair = function() {
    return this.activeScenes;
    //return Random.pickN(2, this.scenes);
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
      return true;
    }
    return false;
  }

  /// Sets the attention value of the passed selector to 0 so it is
  /// never choosen again by the attention net but is still there so it
  /// won't be added again.
  /// TODO: reduce attention of connected nodes in the attention net
  Workspace.prototype.blockSelector = function(sel) {
    this.log(3, 'blocking selector', sel);
    this.attentionNet.setAttentionValue(sel, 0);
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
    return Random.pick(this.activeScenes);
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
    this.ws.attentionNet.normalize('objects');
    this.ws.attentionNet.normalize('features');
    // don't normalize selectors since we want to add new selectors
    // with a constant attention value
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
    if (!options.attention.sel.match) return 0;
    if (same_side) {
      if (match_count === 2) return (is_obj_sel ?  0.1 : 0.1);
      if (match_count === 1) return (is_obj_sel ? -0.3 : 0);
      if (match_count === 0) return (is_obj_sel ?    0 : 0);
    } else {
      if (match_count === 2) return (is_obj_sel ? -0.1 : 0);
      if (match_count === 1) return (is_obj_sel ?  0.2 : 0.2);
      if (match_count === 0) return (is_obj_sel ? -0.3 : 0);
    }
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


    if (this.ws.addSelector(sel, 0.2)) {
      var d_att = this.getAttFromMatchResult(same_side, match_count, is_obj_sel);
      if (options.attention.sel.single && all_single_objs) d_att += 0.3;
      this.ws.changeAttention(sel, d_att);
      if (options.attention.obj.from_sel) {
        sel_grps.forEach(function(group) {
          self.ws.changeAttention(group, self.ws.getAttention(sel));
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
