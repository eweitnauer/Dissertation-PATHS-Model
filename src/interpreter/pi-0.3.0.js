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

		this.attentionNet = new attentionNet();
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
	}

	Workspace.prototype.log = function(level, msg) {
		if (this.log_level < level) return;
		arguments[0] = this.log_symbol[level] + '[' + this.step + ']';
		console.log.apply(console, arguments);
	}

	// TODO: attention net should handle this later (maybe)
	Workspace.prototype.getRandomTime = function() {
		return Random.pick(['start', 'end']);
	}

	// TODO: attention net should handle this later (maybe)
	Workspace.prototype.getRandomScene = function() {
		return Random.pick(this.scenes);
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
		this.ws.log(4, 'inserted',codelet.describe(),'with urgency',urgency);
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
		this.name = 'MainBehavior';
		this.mindset = 0.25;
		this.codelet_infos = [{klass: AttrCodelet, mindset: 0}
					               ,{klass: NewSelectorCodelet, mindset: 0.5}
					               ,{klass: RefineSelectorCodelet, mindset: 0.75}
					               ,{klass: SolveCodelet, mindset: 1}];
	}

	PerceptionBehavior.prototype.describe = function() {
		return 'mindset: ' + this.mindset;
	}

	PerceptionBehavior.prototype.run = function() {
		var mindset_fit = function (cinfo) { return 1-Math.abs(cinfo.mindset-this.mindset) };
		var codelet_info = Random.pick_weighted(this.codelets, mindset_fit);
		this.cs.insert(new codelet_info.klass(this.cr));
	}


	/**
	 * Chooses an attribute and an object or selector (or the other way around)
	 * and perceives the choosen attribute. It may spawn NewSelectorCodelets
	 * (with the current attribute) and RefineSelectorCodelets (with the current
	 * attribute and a different attribute the same object has).
	 */
	var AttrCodelet = function(coderack) {
		this.coderack = coderack;
		this.followup = [];
		this.ws = this.coderack.ws;
	}

	AttrCodelet.prototype.describe = function() {
		return 'AttrCodelet';
	}

	AttrCodelet.prototype.run = function() {
		var target, feature;
		// TODO: we might want to select one of the above first according to their attention
		// values and the other one second with a uniform probability distribution
		feature = this.ws.getRandomFeature();
		if (feature.prototype.arity == 2) { // it is a relation
			var sel = this.ws.getRandomSelector();
			target = this.ws.getGroupFromSelector(sel);
		} else { // it is an object
			target = this.ws.getRandomObject();
		}

		var percept;
		if (percept = target.getFromCache(feature.prototype.key)) {
			// was already perceived before, TODO: decrease activity of feature?
		} else {
			// we'll perceive it now, TODO: increase activity of feature?
			percept = target.get(feature.prototype.key);
		}

		// TODO: spawn NewSelector- or RefineSelectorCodelets
	}

	/**
	 * Chooses an attribute and creates the respective selector. Then it applies
	 * the selector to the currently active scenes. If all scenes match or only
	 * the scenes of one side match, it adds the selector to the global list of
	 * selectors.
	 */
	var NewSelectorCodelet = function(coderack) {
		this.coderack = coderack;
		this.followup = [];
		this.ws = this.coderack.ws;
	}




	/// Uses an all selector to groups all objects in the target scene into one group.
	/// May spawn a key object codelet.
	var GroupAllCodelet = function(coderack, scene) {
		this.coderack = coderack;
		this.ws = coderack.ws;
		this.scene = scene;
		this.followup = [];
	}
	GroupAllCodelet.prototype.describe = function() {
		return 'GroupAllCodelet(' + (this.scene ? this.scene.id : '?') +')';
	}
	GroupAllCodelet.prototype.selector = new Selector('group');
	GroupAllCodelet.prototype.run = function() {
		var sn = this.scene || this.ws.getRandomScene();
		var thiz = this;
		var gn = null;
		sn.groups.some(function (g) { if (thiz.selector.equals(g.selector)) return gn=g; });
		if (!gn) {
			// construct a new all objects group
			gn = this.selector.select(sn.objs, sn)[0];
			if (!gn) return false;
			gn.on('retrieved', this.ws.retrieved_feature.bind(this.ws));
			gn.on('perceived', this.ws.perceived_feature.bind(this.ws));
			sn.groups.push(gn);
		}
		if (Math.random() < 0.5) {
		  var keyc = new KeyObjCodelet(this.coderack, null, 'group');
			this.coderack.insert(keyc, 100);
		}
		return true;
	}

	/// Target can be scene or group node or nothing.
	/// When run, the codelet will perceive its attribute for its object node.
	/// It may spawn a hypothesis constructor codelet using its attribute.
	var GroupAttrCodelet = function(coderack, attr_key, target) {
		this.attr_key = attr_key;
		this.attr = pbpSettings.group_attrs[attr_key];
		this.target = target;
		this.coderack = coderack;
		this.ws = coderack.ws;
		this.followup = [];
	}
	GroupAttrCodelet.prototype.describe = function() {
		return 'GroupAttrCodelet('+(this.attr_key||'?')+','+(this.target ? this.target.id : '?')+')';
	}
	GroupAttrCodelet.prototype.run = function() {
		var gn;
		if (!this.target) this.target = this.ws.getRandomScene();
		if (this.target instanceof SceneNode) {
			var sn = this.target;
			if (sn.groups.length == 0) {
				// there are no groups, spawn new GroupAllCodelet
				var cdl = new GroupAllCodelet(this.coderack, sn);
				cdl.followup.push(this);
				this.coderack.insert(cdl, this.urgency);
				return false;
			} else gn = Random.pick(sn.groups);
		}
		else if (this.target instanceof GroupNode) gn = this.target;

		if (!gn) return false;

		var attr, res;
		if (attr = gn.get(this.attr_key, {cache_only: true})) {
			// was already perceived, decrease activity of attribute
			//attr.decActivity();
			res = false;
		} else {
			// is perceived now, increase activity of attribute
			attr = gn.get(this.attr_key);
			//attr.incActivity();
			res = true;
		}
	  // with probability of 0.5 spawn a key object codelet with Hypothesis Codelet followup
		if (Math.random() < 0.5) {
		  var keyc = new KeyObjCodelet(this.coderack, null, 'group');
			var hypc = new HypAttrCodelet(this.coderack, null, attr, null, gn.scene_node.side);
			keyc.followup.push(hypc);
			this.coderack.insert(hypc, 100);
		}
		return res;
	}

	/// Will rate the objects in a scene by how likely they seem to be a key object. Uses the
	/// given (or random) scene and the given (or random) time.
	var SearchKeyObjectCodelet = function(coderack, scene, time) {
		this.coderack = coderack;
		this.ws = coderack.ws;
		this.followup = [];
		this.scene = scene;
		this.time = time;
	}
	SearchKeyObjectCodelet.prototype.describe = function() {
		return 'SearchKeyObjectCodelet('+(this.scene ? this.scene.id : '?')+','+(this.time||'?')+')';
	}
	SearchKeyObjectCodelet.prototype.run = function() {
		this.ws.log(2, 'running ' + this.describe());
		if (!this.time) this.time = this.ws.getRandomTime();
		if (!this.scene) this.scene = this.ws.getRandomScene();
		// if there is just one object in this scene, don't do anything
		if (this.scene.objs.length == 1) return false;

		// look for an odd shape
		var activations = get_uniqueness(group_by_shape(this.scene.objs));
		this.scene.objs.forEach(function (on) {
			on.setActivity(activations[on.obj.id])
		});
		return true;

		// look for the top-most object

		// look for an spatially single object
	}


	/// Will create a selector based on the passed attr and time (default: random pick) and check
	/// whether the selector just matches a single object per scene. If yes, it will use it as the
	/// new key-selector in the workspace. Every HypAttrCodelet might now choose to use it in its
	/// solution. The mode can be 'unique' (which is default) or 'group'. If attr is null, an empty
	/// selector that matches everything is used.
	var KeyObjCodelet = function(coderack, attr, mode, time) {
		this.coderack = coderack;
		this.ws = coderack.ws;
		this.followup = [];
		this.attr = attr;
		this.time = time;
		this.mode = mode;
	}
	KeyObjCodelet.prototype.describe = function() {
		return 'KeyObjCodelet('+((this.attr&&this.attr.key)||'?')+','+(this.mode||'unique')+')';
	}
	KeyObjCodelet.prototype.run = function() {
		this.ws.log(3, 'running ' + this.describe());
		if (!this.time) this.time = this.ws.getRandomTime();
		if (!this.mode) this.mode = 'unique';
		if (this.mode != 'unique') this.mode = 'group';
		var sel = new Selector(this.mode);
		if (this.attr) sel.add_attr(Selector.AttrMatcher.fromAttribute(this.attr, this.time));
		// return if it doesn't match every scene
		if (!this.ws.scenes.every(function (sn) { return sel.select(sn.objs, sn).length == 1 })) return false;
		// set it as key-obj-selector
		return this.ws.setKeySelector(sel);
	}


	/// Codelet for creating and checking an hypothesis based on an attribute.
	/// Pass the mode of the selector (all, first, but not unique or group), the Attribute class,
	/// the time and the side (left, right). Mode, time and side are optional and
	/// will be chosen randomly if not provided. Selector is optional and if passed will be used
	/// as the first selector in a XIsY solution.
	var HypAttrCodelet = function(coderack, mode, attr, time, side, selector) {
		this.mode = mode;
		this.attr = attr;
		this.time = time;
		this.side = side;
		this.coderack = coderack;
		this.ws = coderack.ws;
		this.followup = [];
		this.selector = selector;
	}
	HypAttrCodelet.prototype.describe = function () {
		return 'HypAttrCodelet('+(this.attr.key ? this.attr.key+'='+this.attr.get_label() : '?')+','
			                      +(this.mode||'?')+','
			                      +(this.selector ? ','+this.selector.describe2() : '?')+','
			                      +(this.side || '?') + ')';
	}
	HypAttrCodelet.prototype.run = function() {
		if (!this.side) this.side = Random.pick(['left', 'right']);
		if (!this.time) this.time = this.ws.getRandomTime();
		if (!this.mode) this.mode = Random.pick(['all', 'first']);

		// parameter selector based solution
		if (this.selector) {
			var sel = new Selector(this.mode);
			sel.add_attr(Selector.AttrMatcher.fromAttribute(this.attr, this.time));
			// base the solution on a selector
			var sol = new Solution.XIsY(this.selector, sel, this.side);
			this.ws.checkSolution(sol);
			return true;
		}

		// key_selector based solution
		var ks = this.ws.key_sel;
		if (ks && this.mode != 'group') {
			if ((ks.mode == 'group' && (this.attr.key in pbpSettings.group_attrs)) ||
					(ks.mode != 'group' && (this.attr.key in pbpSettings.obj_attrs))) {
				// base the solution on a key object
				var sel = new Selector('unique');
				sel.add_attr(Selector.AttrMatcher.fromAttribute(this.attr, this.time));
				var sol = new Solution.XIsY(this.ws.key_sel, sel, this.side);
				this.ws.checkSolution(sol);
				return true;
			}
		}

		// global solution
		if (this.attr.key in pbpSettings.obj_attrs)	{
			var sel = new Selector(this.mode);
			sel.add_attr(Selector.AttrMatcher.fromAttribute(this.attr, this.time));
			var sol = new Solution.IsX(sel, this.side);
			this.ws.checkSolution(sol);
			return true;
		}

		return false;
	}

	return {Workspace: Workspace
	       ,Coderack: Coderack
	       ,version: version
	     	 };
})();
