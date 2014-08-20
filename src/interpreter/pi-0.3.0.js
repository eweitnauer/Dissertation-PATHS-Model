/* jshint laxcomma: true, asi: true */
var PI = PI || {};

/*
Version 0.3.0
 - a fresh start that uses new types of codelets and the new solution
   and selector types
 - covers these features: -
		//['shape','stability','count','close','left_pos','right_pos','left_most','right_most','touching','can_move_up']);
 - can solve these PBPs: -
*/

PI.v0_3_0 = (function() {
	var version = '0.3.0';

	var options = {
		active_scenes: 'b/w' // can be 'w/i' or 'b/w'
	 ,features: [CountAttribute, ShapeAttribute, StabilityAttribute, CloseAttribute]
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
	// attention from old to new shifts slowly over time.
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
			this.log(4, 'added selector', sel);
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

	Workspace.prototype.addSolution = function(sol) {
		this.solutions.push(sol);
		this.log(3, 'correct solution:', sol.describe());
	}

	Workspace.prototype.getGroupBySelector = function(sel, scene) {
		for (var i=0; i<scene.groups.length; i++) {
			var g = scene.groups[i];
			if (g.selectors.length == 1 && g.selectors[0] == sel) return g;
			if (g.selectors.length == 0 && sel.blank()) return g;
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
	Coderack.prototype = new Array();

	Coderack.prototype.step = function() {
		this.ws.step++;
		if (this.followups.length == 0) this.runBehaviors();
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
  	if (this.length == 0) return 'empty coderack';
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
		if (this.length == 0) return null;
		return Random.pick_weighted(this, function(c) { return c.urgency });
	};

	/// Select next codelet based on their urgencies.
	Coderack.prototype.select_and_remove = function() {
		if (this.length == 0) return null;
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
			if (this.length==0) { this.ws.log(2, 'no codelet to run'); return false }
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
					               //,{klass: RefineSelectorCodelet, mindset: 0.75} //TODO: this codelet is not written so far
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

	AttrCodelet.prototype.run = function() {
		var target, percept;
		var feature = this.ws.getRandomFeature();
		var scene = this.ws.getRandomScene();
		if (feature.prototype.targetType == 'group') {
			sel = this.ws.getRandomSelector({type: 'object'});
			target = this.ws.getOrCreateGroupBySelector(sel, scene);
			if (target.empty()) return; // TODO: decrease selector attention
		} else if (feature.prototype.targetType == 'obj') {
			target = this.ws.getRandomObject(scene);
		} else throw "unknown target type";

		if (feature.prototype.arity == 1) { // attribute
			percept = target.getFromCache(feature.prototype.key, {time: this.time});
			if (percept) this.spawnNewSelCodelet(percept, this.time);
			else percept = target.get(feature.prototype.key, {time: this.time});
			this.ws.log(4, 'perceived', feature.prototype.key, 'on', target, percept);
		} else if (feature.prototype.arity == 2) { // relationship
			var other_sel = this.ws.getRandomSelector(); // TODO: so we instead want to pick a random object
			                                             // and construct a selector from that object later
			percept = target.get(feature.prototype.key, {other: other_sel, time: this.time});
			if (percept) this.spawnNewSelCodelet(percept, this.time);
			else percept = target.get(feature.prototype.key, {other: other_sel, time: this.time});
			this.ws.log(4, 'perceived', feature.prototype.key, 'on', target, 'and', other_sel);
		} else throw "only features with arity 1 or 2 are supported";

		// TODO: use the following pattern to change attention based on whether the
		// percept had beed perceived before or not
		// if (percept = target.getFromCache(feature.prototype.key)) {
		// 	// was already perceived before, TODO: decrease activity of feature?
		// } else {
		// 	// we'll perceive it now, TODO: increase activity of feature?
		// 	percept = target.get(feature.prototype.key);
		// }

		// TODO: spawn NewSelector- or RefineSelectorCodelets
	}

	/**
	 * Uses the passed attribute / relationship and side to create the
	 * respective selector. Then it applies the selector to the currently active
	 * scenes. If all scenes match or only the scenes of one side match, it adds
	 * the selector to the global list of selectors.
	 */
	var NewSelectorCodelet = function(coderack, percept, time) {
		this.coderack = coderack;
		this.followup = [];
		this.ws = this.coderack.ws;
		this.percept = percept;
		this.time = time;
	}

	NewSelectorCodelet.prototype.describe = function() {
		return 'NewSelectorCodelet(' + this.percept.key + '=' + this.percept.val + ')';
	}

	/**
	 * Create selector with the passed percept and apply it to the current
	 * scenes. Then add it to the active selectors if it matches all scenes
	 * or just all scenes from one side.
	 */
	NewSelectorCodelet.prototype.run = function() {
		var self = this;

		var sel = new Selector();
		if (this.percept.arity == 2) sel.use_rel(this.percept, this.time);
		else sel.use_attr(this.percept, this.time);

		if (this.percept.group && this.percept.group.selectors.length > 0) {
			// TODO: the percept was perceived for a group which is based on a particular
			// selector ==> we need to somehow combine both selectors
		}

		var scenes = this.ws.getActiveScenes();
		var groups = [];
		var matching_scenes = scenes.filter(function (scene) {
			var res_group = self.ws.getOrCreateGroupBySelector(sel, scene);
			return (!res_group.empty());
		});

		if (matching_scenes.length == 0) {
			// TODO: disencourage / remove the selector from the workspace
			return;
		}

		var all_from_one_side = matching_scenes.every(function (scene) {
		  return scene.side == matching_scenes[0].side;
		});
		if (matching_scenes.length == scenes.length || all_from_one_side) {
			sel.side = all_from_one_side ? scenes[0].side : 'both';
			this.ws.addSelector(sel);
			//this.coderack.insert(new SolutionCodelet(this.coderack, sel));
		}
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
		var sel = this.ws.getRandomSelector({no_blank: true});
		if (!sel) return;
		var sol = new Solution(sel);
		var found_sol = false;
		var self = this;
		var addSolFn = function(sol) {
			self.ws.addSolution(sol);
			found_sol = true;
		}

		var is_group_sol = sol.sels[sol.sels.length-1].isOfType('group');
		var res = this.runWithSolution(sol, 'exists', addSolFn, function(reason, same_as_blank) {
			if (reason == 'too specific') {
				self.ws.blockSelector(sel);
		  } else if (reason == 'too general' && !is_group_sol) { // unique or all don't make sense for
		  	self.runWithSolution(sol, 'all', addSolFn);					 // group based solutions
		  	self.runWithSolution(sol, 'unique', addSolFn);
		  	if (!found_sol) {
		  		if (!same_as_blank) {
		  			// TODO: mark selector as generalizer for merging with other selectors
		  			// we only need to consider generalizers for chaining solutions
		  		}
		  	}
		  }
		});
	}

	return {Workspace: Workspace
	       ,Coderack: Coderack
	       ,version: version
	     	 };
})();
