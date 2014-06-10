var PI = PI || {};

/*
Version 0.2.5
 - attempts to solve complex PBPs faster by looking for key-objects top-down,
   the new SearchKeyObjectBehavior's activity is set to 10, so should run every 10th step
   it won't run at all for problems with a single object per scene.
 - on creation, the workspace will call asActivatible on all objects and set their activity
   to 100/#objs per scene
 - the workspace.getRandomObject() method now takes each object's activity into account but
   ignores which object is the key-object. Instead, give a big activity boost to all key-objects
   when setting a new key-selector.

Version 0.2.4
 - solves new PBP 18 by using group attribute touching
 - solves new PBP 31 by using the can-move-up attribute

Version 0.2.3
 - set the group selectors as key-object
 - count feature perceptions and retrievals

Version 0.2.2
 - apdapted to different behavior of 'group' selector

Version 0.2.1
 - made time of perception (start / end) random
 - disabled activity changes for perception

Version 0.2.0
 - create selectors from perceived attribtues to find key-objects
 - added 'left-pos' and 'right-pos' attribute
 - changed initial preception acitivity to 18
 - getRandomObject will prefer the key-object now (2x more probable than all other objects combined)

Version 0.1.2
 - added close group attribute
 - changed initial preception acitivity to 25

Version 0.1.1
 - added GroupAllCodelet
*/

PI.v0_2_5 = (function() {
	var version = '0.2.5';

	/// Mixin Pattern, call asActivatible.call(TargetClass.prototype);
	var asActivatible = function() {
	  this._activity = 0;
	  var thiz = this;

	  this.setActivity = function(activity) { thiz._activity = activity }
	  this.getActivity = function() { return thiz._activity }

	  this.incActivity = function() {
	  	thiz._activity = Math.min(100, thiz._activity * 10/9);
	  }

	  this.decActivity = function() {
	  	thiz._activity = Math.max(1, thiz._activity * 9/10);
	  }

	  /// Random result, based on activity (100 => always true, 0 => always false).
	  this.isActive = function() {
	  	return (Math.random() < (thiz._activity/100));
	  }

	  return this;
	};

var asActivatibleInstance = function() {
		this._activity = 0;

	  this.setActivity = function(activity) { this._activity = activity }
	  this.getActivity = function() { return this._activity }

	  this.incActivity = function() {
	  	this._activity = Math.min(100, this._activity * 10/9);
	  }

	  this.decActivity = function() {
	  	this._activity = Math.max(1, this._activity * 9/10);
	  }

	  /// Random result, based on activity (100 => always true, 0 => always false).
	  this.isActive = function() {
	  	return (Math.random() < (this._activity/100));
	  }

	  return this;
	};
	asActivatibleInstance.call(ObjectNode.prototype);

	/// The workspace is a container for all objects the interpreter works with
	/// and has some utility functions for accessing them.
	var Workspace = function(scenes, log_level) {
		this.scenes = scenes;
		this.left_scenes = scenes.filter(function(sn) { return sn.side == 'left'});
		this.right_scenes = scenes.filter(function(sn) { return sn.side == 'right'});
		this.set_activities();
		this.perception_count = 0;
		this.retrieval_count = 0;
		this.register_events();

		this.solutions = []; // will hold all correct solutions that were found
		this.key_sel = null; // will be set to a key selector during solving

		this.log_level = {debug: 4, info: 3, warn: 2, error: 1, no: 0}[log_level || 'no'];
		this.log_symbol = {1: 'EE', 2: 'WW', 3: 'II', 4: 'DB'};
		this.step = 1;

		this.coderack = new Coderack(this);
		var pb = new PerceptionBehavior(this.coderack, ['shape','stability','count','close','left_pos','right_pos','left_most','right_most','touching','can_move_up']);
		this.coderack.behaviors.push(pb);
		this.coderack.behaviors.push(new SearchKeyObjectBehavior(this.coderack));
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

	Workspace.prototype.set_activities = function() {
		this.scenes.forEach(function (sn) {
			var N = sn.objs.length;
			sn.objs.forEach(function (on) { on.setActivity(100/N); });
		});
	}

	Workspace.prototype.log = function(level, msg) {
		if (this.log_level < level) return;
		arguments[0] = this.log_symbol[level] + '[' + this.step + ']';
		console.log.apply(console, arguments);
	}

	Workspace.prototype.getRandomTime = function() {
		return Random.pick(['start', 'end']);
	}

	Workspace.prototype.getRandomScene = function() {
		return this.scenes[Random.int(this.scenes.length)];
	}

	Workspace.prototype.getRandomObject = function(scene) {
		if (typeof(scene) == 'undefined') scene = this.getRandomScene();
		return Random.pick_weighted(scene.objs, function (on) { return on.getActivity() });
	}

	Workspace.prototype.checkSolution = function(sol) {
		this.log(3, 'checking solution ' + sol.describe());
		var res = sol.check(this.left_scenes, this.right_scenes);
		if (res) {
			this.solutions.push(sol);
		  this.log(3, 'correct solution:', sol.describe());
		}
	}

	Workspace.prototype.setKeySelector = function(sel) {
		this.log(3, 'considering "'+sel.describe()+'" as key selector');
		if (sel.equals(this.key_sel)) return true;
		var chance = 0.25;	// take new selector with 25%
		if (!this.key_sel) chance = 1; // if we had none, take it with 100%
		if (this.key_sel && sel.blank() && !this.key_sel.blank()) chance = 0.1; // if the new one matches everything, but the old one not, take it with 10%
		if (this.key_sel && !sel.blank() && this.key_sel.blank()) chance = 0.9; // if the current one matches everything, but the new one not, take it with 90%
		if (Math.random() < chance) {
			if (this.key_sel) {
				// TODO: we might reduce the activity of the old key-objects here
			}
			this.log(2, 'setting "'+sel.describe()+'" as key selector');
			this.key_sel = sel;
			// boost activity of objects that are key-objects in each scene, but only if the selector is not a group selector
			// afterwards, normalize so the activity sum is 100
			if (sel.mode != 'group') {
				this.scenes.forEach(function (sn) {
					var N = sn.objs.length;
					var obj = sel.select(sn.objs, sn)[0];
					obj.setActivity(obj.getActivity() + 50);
					var total_activity = sn.objs.map(function (on) { return on.getActivity() }).reduce(function (a,b) { return a+b });
					sn.objs.forEach(function (on) { on.setActivity(on.getActivity()*100/total_activity) });
				});
			}
			return true;
		}
		return false;
	};

	Workspace.prototype.describe = function() {
		this.coderack.describe();
	}

	/// The coderack holds all codelets with are inserted using the
	/// insert() method. Call the step() method for running all behaviors and
	/// a random codelet.
	/// TODO: include temperature for coderack
	var Coderack = function(workspace) {
		this.max_length = 50;
		this.behaviors = [];
		this.followups = []; // first priority
		this.ws = workspace;
	}
	Coderack.prototype = new Array();

	Coderack.prototype.describe = function() {
  	if (this.length == 0) return 'empty coderack';
		var bs = {};
		this.forEach(function (c) {
			var t = c.name;
			if (t in bs) bs[t]++;
			else bs[t] = 1;
		});
		var str=[];
		for (var t in bs) { str.push(t+": " + bs[t]) }
		return 'coderack: ' + str.join(', ');
		//this.behaviors.forEach(function (b) { return b.describe() })
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
		this.behaviors.forEach(function(b) {
			thiz.ws.log(4, 'running', b.name);
			b.run();
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
			// make a decision of whether the next followup is run now or inserted
			// into the coderack
			// for now just run it immediately

			//this.ws.log(4, 'we have a followup!');
			//var next = cdl.followup.shift();
		  //next.followup = cdl.followup;
			//this.followups.push(next);
			while (cdl.followup.length > 0) this.insert(cdl.followup.shift(), cdl.urgency);
		}
	}

	/// Picks a random codelet, runs it and removes it.
	Coderack.prototype.step = function() {
		this.ws.step++;
		if (this.followups.length == 0) this.runBehaviors();
		this.runCodelet();
	}





	/// Capsulates the perception behavior. It will create new codelets based
	/// on the activities of the registered attributes.
	var PerceptionBehavior = function(coderack, attrs) {
		this.attrs = [];
		this.group_attrs = [];
		this.cr = coderack;
		this.name = 'PerceptionBehavior';
		attrs = attrs || [];
		this.initial_activity = (attrs.length ? 100/attrs.length : 100);
		attrs.forEach(this.addAttribute.bind(this));
	}
	PerceptionBehavior.prototype.describe = function() {
		var out = [];
		this.attrs.forEach(function (attr) { out.push(attr.prototype.key + ': ' + attr.prototype.getActivity()) });
		return out.join(', ');
	}
	PerceptionBehavior.prototype.addAttribute = function(key) {
		if (key in pbpSettings.obj_attrs) {
			var attr = pbpSettings.obj_attrs[key];
			this.attrs.push(attr);
		} else if (key in pbpSettings.group_attrs) {
			var attr = pbpSettings.group_attrs[key];
			this.group_attrs.push(attr);
		} else throw "unknown attribute "+key;
		if (!('activity' in attr)) asActivatible.call(attr.prototype);
		attr.prototype.setActivity(this.initial_activity);
	}
	PerceptionBehavior.prototype.run = function() {
		for (var i=0; i<this.attrs.length; i++) {
		  var attr = this.attrs[i];
		  // if its active, add a perception codelet
		  if (attr.prototype.isActive()) {
		  	this.cr.insert(new AttrCodelet(this.cr, attr.prototype.key));
		  }
		}
		for (var i=0; i<this.group_attrs.length; i++) {
		  var attr = this.group_attrs[i];
		  // if its active, add a perception codelet
		  if (attr.prototype.isActive()) {
		  	this.cr.insert(new GroupAttrCodelet(this.cr, attr.prototype.key));
		  }
		}
	}

	/// Creates new top-down codelets that search for single key-objects.
	var SearchKeyObjectBehavior = function(coderack, activity) {
		this.name = 'SearchKeyObjectBehavior';
		this.cr = coderack;
		this.adaptActivity();
	}
	asActivatible.call(SearchKeyObjectBehavior.prototype);
	// the more objects, the more often this should be called. but for now, just use
	// a simple threshold: if we have only one object per scene, never run, otherwise
	// run with 10% probability
	SearchKeyObjectBehavior.prototype.adaptActivity = function() {
		var obj_count = this.cr.ws.scenes.map(function (sn) { return sn.objs.length }).reduce(function (a,b) { return a+b });
		this.setActivity(obj_count == this.cr.ws.scenes.length ? 0 : 10);
	}
	SearchKeyObjectBehavior.prototype.describe = function() {
		return this.name;
	}
	SearchKeyObjectBehavior.prototype.run = function() {
		if (this.isActive()) this.cr.insert(new SearchKeyObjectCodelet(this.cr));
	}

	/// Target can be scene or object node or nothing.
	/// When run, the codelet will perceive its attribute for its object node.
	/// May spawn a hypothesis constructor codelet using its attribute.
	/// May spawn a key object codelet if there are >1 objects in the scene
	var AttrCodelet = function(coderack, attr_key, target) {
		this.attr_key = attr_key;
		this.attr = pbpSettings.obj_attrs[attr_key];
		this.target = target;
		this.coderack = coderack;
		this.ws = coderack.ws;
		this.followup = [];
	}
	AttrCodelet.prototype.describe = function() {
		return 'AttrCodelet('+ (this.attr_key || '?') + ',' +
			      (this.target ? (this.target instanceof SceneNode ? this.target.id : ('o in '+this.target.scene_node.id)) : '?') +')';
	}
	AttrCodelet.prototype.run = function() {
		var on;
		if (!this.target) on = this.ws.getRandomObject();
		else if (this.target instanceof SceneNode) on = this.ws.getRandomObject(this.target);
		else if (this.target instanceof ObjectNode) on = this.target;
		if (!on) return false;
		var attr, res;
		if (attr = on.get(this.attr_key, {from_cache: true})) {
			// was already perceived, decrease activity of attribute
			//attr.decActivity();
			res = false;
		} else {
			// is perceived now, increase activity of attribute
			attr = on.get(this.attr_key);
			//attr.incActivity();
			res = true;
		}
	  // with probability of 0.5 spawn an matching Hypothesis Codelet
		if (Math.random() < 0.5) {
			var sn = on.scene_node;
			var hypc = new HypAttrCodelet(this.coderack, null, attr, null, sn.side);
			this.coderack.insert(hypc, 100);
		}
		// with probability of 0.5 spawn an matching Key Selector codelet if we have > 1 objects
		// in the scene
		if (on.scene_node.objs.length > 1 && Math.random() < 0.2) {
			this.coderack.insert(new KeyObjCodelet(this.coderack, attr, null), 30);
		}
		return res;
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
		if (attr = gn.get(this.attr_key, {from_cache: true})) {
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
