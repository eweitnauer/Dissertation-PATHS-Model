var PI = PI || {};

/* Version 0.1.1
 - added GroupAllCodelet
*/

PI.v0_1_1 = (function() {
	/// The workspace is a container for all objects the interpreter works with
	/// and has some utility functions for accessing them.
	var Workspace = function(scenes, debug) {
		this.coderack = new Coderack(this, debug);
		var pb = new PerceptionBehavior(this.coderack, 33);
		pb.addAttribute('shape');
		pb.addAttribute('stability');
		pb.addAttribute('count');
		this.coderack.behaviors.push(pb);

		this.scenes = scenes;
		this.left_scenes = scenes.filter(function(sn) { return sn.side == 'left'});
		this.right_scenes = scenes.filter(function(sn) { return sn.side == 'right'});

		this.solutions = []; // will hold all correct solutions that were found

		this.debug = debug;
	}

	Workspace.prototype.getRandomScene = function() {
		return this.scenes[Random.int(this.scenes.length)];
	}

	Workspace.prototype.getRandomObject = function(scene) {
		if (typeof(scene) == 'undefined') scene = this.getRandomScene();
		return scene.objs[Random.int(scene.objs.length)];
	}

	Workspace.prototype.checkSolution = function(sol) {
		if (this.debug) console.log('checking solution ' + sol.describe());
		var res = sol.check(this.left_scenes, this.right_scenes);
		if (res) {
			this.solutions.push(sol);
			//if (this.debug) console.log('CORRECT!');
		  if (this.debug) console.log('correct solution:', sol.describe());
		}
		else if (this.debug) console.log('wrong.')
	}

	Workspace.prototype.describe = function() {
		this.coderack.describe();
	}

	/// The coderack holds all codelets with are inserted using the
	/// insert() method. Call the step() method for running all behaviors and
	/// a random codelet.
	/// TODO: include temperature for coderack
	var Coderack = function(workspace, debug) {
		this.max_length = 50;
		this.behaviors = [];
		this.followups = []; // first priority
		this.ws = workspace;
		this.debug = debug;
	}
	Coderack.prototype = new Array();

	Coderack.prototype.describe = function() {
		if (this.length == 0) {
			console.log('empty coderack');
			return;
		}
		var bs = {};
		this.forEach(function (c) {
			var t = c.name;
			if (t in bs) bs[t]++;
			else bs[t] = 1;
		});
		var str=[];
		for (var t in bs) { str.push(t+": " + bs[t]) }
		if (this.debug) console.log('coderack:',str.join(', '));
		this.behaviors.forEach(function (b) { return b.describe() })
	}

	/// Default urgency is 10. Urgency must be above 0.
	Coderack.prototype.insert = function(codelet, urgency) {
		codelet.urgency = urgency || 10;
		this.push(codelet);
		if (this.debug) console.log('inserted',codelet.describe(),'with urgency',urgency);
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
		this.behaviors.forEach(function(b) {
			if (this.debug) console.log('running', b.name);
			b.run();
		});
	}

	Coderack.prototype.runCodelet = function() {
		var cdl;
		if (this.followups.length > 0) {
			if (this.debug) console.log('running followup');
			cdl = this.followups.shift();
		} else {
			if (this.length==0) { console.log('no codelet to run'); return false }
			cdl = this.select_and_remove();
		}
		if (this.debug) console.log('running', cdl.describe());
		var res = cdl.run();
		if (res && cdl.followup && cdl.followup.length > 0) {
			// make a decision of whether the next followup is run now or inserted
			// into the coderack
			// for now just run it immediately

			//if (this.debug) console.log('we have a followup!');
			//var next = cdl.followup.shift();
		  //next.followup = cdl.followup;
			//this.followups.push(next);
			this.insert(cdl.followup.shift(), cdl.urgency);
		}
	}

	/// Picks a random codelet, runs it and removes it.
	Coderack.prototype.step = function() {
		//console.log('coderack:', this.map(function (args) { return args }));
		//console.log(this.followups.length);
		if (this.followups.length == 0) this.runBehaviors();
		this.runCodelet();
	}


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


	/// Capsulates the perception behavior. It will create new codelets based
	/// on the activities of the registered attributes.
	var PerceptionBehavior = function(coderack, initial_activity) {
		this.attrs = [];
		this.group_attrs = [];
		this.cr = coderack;
		this.name = 'PerceptionBehavior';
		this.initial_activity = initial_activity;
	}
	PerceptionBehavior.prototype.describe = function() {
		var out = [];
		this.attrs.forEach(function (attr) { out.push(attr.prototype.key + ': ' + attr.prototype.getActivity()) });
		console.log(out.join(', '));
	}
	PerceptionBehavior.prototype.addAttribute = function(key) {
		if (key in pbpSettings.obj_attrs) {
			var attr = pbpSettings.obj_attrs[key];
			this.attrs.push(attr);
		} else if (key in pbpSettings.group_attrs) {
			var attr = pbpSettings.group_attrs[key];
			this.group_attrs.push(attr);
		} else return;
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

	/// Target can be scene or object node or nothing.
	/// When run, the codelet will perceive its attribute for its object node.
	/// It may spawn a hypothesis constructor codelet using its attribute.
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
		if (attr = on.get(this.attr_key, {cache_only: true})) {
			// was already perceived, decrease activity of attribute
			attr.decActivity();
			res = false;
		} else {
			// is perceived now, increase activity of attribute
			attr = on.get(this.attr_key);
			attr.incActivity();
			res = true;
		}
	  // with probability of 0.5 spawn an matching Hypothesis Codelet
		if (Math.random() < 0.5) {
			var sn = on.scene_node;
			var hypc = new HypAttrCodelet(this.coderack, null, attr, sn.oracle.curr_state, sn.side);
			this.coderack.insert(hypc, 100);
		}
		return res;
	}

	/// Uses an all selector to groups all objects in the target scene into one group.
	var GroupAllCodelet = function(coderack, scene) {
		this.coderack = coderack;
		this.ws = coderack.ws;
		this.scene = scene;
		this.followup = [];
	}
	GroupAllCodelet.prototype.describe = function() {
		return 'GroupAllCodelet(' + (this.scene ? this.scene.id : '?') +')';
	}
	GroupAllCodelet.prototype.selector = new Selector('all');
	GroupAllCodelet.prototype.run = function() {
		var sn = this.scene || this.ws.getRandomScene();
		var thiz = this;
		if (sn.groups.some(function (g) { return g.selector === thiz.selector })) {
			// we already have an all objects group
			return false;
		}
		// construct a new all objects group
		sn.groups.push(GroupNode.fromSelector(sn, this.selector));
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
			attr.decActivity();
			res = false;
		} else {
			// is perceived now, increase activity of attribute
			attr = gn.get(this.attr_key);
			attr.incActivity();
			res = true;
		}
	  // with probability of 0.5 spawn an matching Hypothesis Codelet
		if (Math.random() < 0.5) {
			var sn = gn.scene_node;
			var hypc = new HypAttrCodelet(this.coderack, 'group', attr, sn.oracle.curr_state, sn.side);
			this.coderack.insert(hypc, 100);
		}
		return res;
	}

	/// Codelet for creating and checking an hypothesis based on an attribute.
	/// Pass the mode of the selector (all, first, but not unique or group), the Attribute class,
	/// the time and the side (left, right). All except the attribute are optional and
	/// will be chosen randomly if not provided.
	var HypAttrCodelet = function(coderack, mode, attr, time, side) {
		this.mode = mode;
		this.attr = attr;
		this.time = time;
		this.side = side;
		this.coderack = coderack;
		this.ws = coderack.ws;
		this.followup = [];
	}
	HypAttrCodelet.prototype.describe = function () {
		return 'HypAttrCodelet('+(this.attr.key||'?')+','+(this.mode||'?')+')';
	}
	HypAttrCodelet.prototype.run = function() {
		if (!this.mode) this.mode = Random.pick(['all', 'first']);
		if (!this.side) this.side = Random.pick(['left', 'right']);
		if (!this.time) this.time = Random.pick(['start', 'end']);
		var sel = new Selector(this.mode);
		sel.add_attr(Selector.AttrMatcher.fromAttribute(this.attr, this.time));
		var sol = new Solution.IsX(sel, this.side);
		this.ws.checkSolution(sol);
		return true;
	}

	return {Workspace: Workspace
	       ,Coderack: Coderack
	       ,PerceptionBehavior: PerceptionBehavior
	       ,AttrCodelet: AttrCodelet
	       ,HypAttrCodelet: HypAttrCodelet
	     	 };
})();

/** Testing
var pi = PI.v0_1_0;
scenes = []; for (p in problems) scenes.push(problems[p].sn);
var ws = new pi.Workspace(scenes, true);
ws.coderack.step(); ws.describe();
*/
