/* jshint laxcomma: true, asi: true */
var PI = PI || {};

/*

Version 0.3.6
- in SolutionCodelet mark selectors that are too general (sel.too_general = true)
- don't use such selectors again in a SolutionCodelet
- only use such selectors in the CombineSelectorCodelet
- just PBP 12:  39 +- 23 steps [OnTopRelationship, SmallAttribute]
       PBP 13:  49 +- 22 steps [CountAttr, OnGroundAttr]
       PBP 20: 211 +-208 steps [SupportsRelationship, ShapeAttribute]
       PBP 26: 108 +- 76 steps [ShapeAttribute, LeftAttribute]
       PBP 31:  84 +- 39 steps [MovableUpAttribute, ShapeAttribute]

Version 0.3.5
- solving single problems in principle
- just PBP  2:  13 +-  7 steps [CountAttribute]
       PBP  4:  14 +-  8 steps [ShapeAttribute]
       PBP  8:  25 +- 19 steps [StabilityAttribute]
       PBP 11:  15 +- 10 steps [CloseAttribute]
       PBP 12:  62 +- 48 steps [OnTopRelationship, SmallAttribute]
       PBP 13:  56 +- 39 steps [CountAttribute, OnGroundAttribute]
			 PBP 16:  65 +- 33 steps [RightRelationship, LeftRelationship, ShapeAttribute]
       PBP 18:  26 +- 15 steps [TouchAttribute, TouchRelationship]
       PBP 20: 320 +-276 steps [SupportsRelationship, ShapeAttribute]
       PBP 22:  18 +- 10 steps [HitsRelationship, CollidesRelationship]
       PBP 26: 167 +-126 steps [ShapeAttribute, LeftAttribute]
       PBP 31: 130 +- 79 steps [MovableUpAttribute, ShapeAttribute]

Version 0.3.4
- integrating problem 13 (unique on ground at end)
- switched to groups having a single selector
- selector can now be of type mixed
- fixed bug in Workspace.getGroupBySelector
- we will disallow unique solution to check whether merging object & group
  features works ==> it works: PBP13 - 222 steps (+-133)
- will all other features added back in (7 Attributes and 2 Relationships):
		PBPs:   2 (143 +-155 steps 100%)
		      , 4 ( 81 +- 52 steps 100%)
		      , 8 (154 +-140 steps 100%)
		      ,11 (516 +-447 steps  57%)
		      ,12 (397 +-303 steps  91%)
		      ,22 (230 +-230 steps  99%)

Version 0.3.3
- working on combination of selectors
- new relationship: left-of, right-of
- solves PBP16 (circle, left-most): 90 steps (+-58)

Version 0.3.2
- simply added feature hit-relationship
- can solve these PBPs:   2 (35 steps)  - same
                        , 4 (32 steps)  - same
                        , 8 (50 steps)  - same
                        ,11 (81 steps)  - more
 												,12 (121 steps) - more
 												,22 (82 steps)  - new

Version 0.3.1
- added relationships
- new feature added: on-top-of
- will block relationship features when it tries to apply them to a scene with a single object
- can solve these PBPs:   2 (36 steps) - same
                        , 4 (32 steps) - same
                        , 8 (53 steps) - same
                        ,11 (60 steps) - more!
 												,12 (104 steps) - new

Version 0.3.0
 - a fresh start that uses new types of codelets and the new solution
   and selector types
 - covers these features: count, shape, stability, close
 - can solve these PBPs:  2 (38 steps)
                        , 4 (32 steps)
                        , 8 (49 steps)
                        ,11 (33 steps)
*/

PI.v0_3_5 = (function() {
	var version = '0.3.5';

	var options = {
		active_scenes: 'b/w' // can be 'w/i' or 'b/w'
	 ,features:  [MovableUpAttribute, ShapeAttribute]
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

		if (options.active_scenes == 'w/i')
			this.activeScenes = [this.left_scenes[0], this.left_scenes[1]]; // FIXME: shift attetention between scenes
		else
			this.activeScenes = [this.left_scenes[0], this.right_scenes[0]]; // FIXME: shift attetention between scenes

		this.attentionNet = new AttentionNet();
		this.initAttentionNet();
		this.coderack = new Coderack(this);

		this.coderack.behaviors.push(new MainBehavior(this.coderack));
	}

	Workspace.prototype.perceived_feature = function() {
		this.perception_count++;
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

	Workspace.prototype.getSelectorInfoArray = function() {
		var self = this;
		return this.attentionNet.selectors.map(function(sel) {
			return { val: self.attentionNet.getAttentionValue(sel)
				     , sel: sel.describe()
				     , src: sel }
		});
	}

	Workspace.prototype.log = function(level, msg) {
		if (this.log_level < level) return;
		var lvl = level;
		level = this.log_symbol[level] + '[' + this.step + ']';
		if (lvl == 1) console.error.apply(console, arguments);
		else if (lvl == 2) console.warn.apply(console, arguments);
		else if (lvl == 3) console.info.apply(console, arguments);
		else console.log.apply(console, arguments);
	}

	// TODO: attention net should handle this later (maybe)
	Workspace.prototype.getRandomTime = function() {
		return Random.pick(['start', 'end']);
	}

	// TODO: implement an attention shifting algorithm that shifts
	// attention from old to new scenes slowly over time.
	Workspace.prototype.getActiveScenes = function() {
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
	Workspace.prototype.addSelector = function(sel) {
		if (this.attentionNet.addSelector(sel)) {
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
		this.log(3, 'correct solution:', sol.describe());
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

	Workspace.prototype.checkSolution = function(sol) {
		this.log(3, 'checking solution ' + sol.describe());
		var res = sol.check(this.left_scenes, this.right_scenes);
		if (res) {
			this.solutions.push(sol);
		  this.log(3, 'correct solution:', sol.describe());
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
		this.ws.log(4, 'running', cdl.describe());
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

	AttrCodelet.prototype.perceiveAttr = function(target, feature) {
		var percept = target.getFromCache(feature.prototype.key, {time: this.time});
		if (percept) this.spawnNewSelCodelet(percept, this.time);
		else percept = target.get(feature.prototype.key, {time: this.time});
		this.ws.log(4, 'perceived', feature.prototype.key, 'on', target, percept);
	}

	AttrCodelet.prototype.perceiveRel = function(scene, target_obj, feature) {
		if (scene.objs.length < 2) {
			this.ws.blockFeature(feature);
			return;
		}
		var other;
		do other = this.ws.getRandomObject(scene); while(other === target_obj);
		percept = target_obj.getFromCache(feature.prototype.key, {other: other, time: this.time});
		if (percept) this.spawnNewSelCodelet(percept, this.time);
		else percept = target_obj.get(feature.prototype.key, {other: other, time: this.time});
		this.ws.log(4, 'perceived', feature.prototype.key
		             , 'on', target_obj, 'and', other, ':', percept);
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

		var scenes = this.ws.getActiveScenes();
		var groups = [];
		var matching_scenes = scenes.filter(function (scene) {
			var res_group = self.ws.getOrCreateGroupBySelector(sel, scene);
			return (!res_group.empty());
		});

		if (matching_scenes.length == 0) return; //TODO: disencourage this type of selector

		var all_from_one_side = matching_scenes.every(function (scene) {
		  return scene.side == matching_scenes[0].side;
		});
		if (matching_scenes.length == scenes.length || all_from_one_side) {
			sel.side = all_from_one_side ? scenes[0].side : 'both';
			this.ws.addSelector(sel);
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
		  function(sel) {	return (sel.type !== 'mixed') && sel.too_general }
		});
		if (!sel1) return;
		var sel2 = this.ws.getRandomSelector({no_blank: true, filter:
		  function(sel) { return ((sel !== sel1) && (sel.type === sel1.type) && sel.too_general)	}
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
		this.ws.log(3, 'picking a selector from sels=', sels);
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
		  		self.runWithSolution(sol, 'all', addSolFn);					 // group based solutions
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
