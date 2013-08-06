var PI = PI || {};

PI.v0_1_0 = (function() {
	/// The workspace is a container for all objects the interpreter works with
	/// and has some utility functions for accessing them.
	Workspace = function(scenes, debug) {
		this.coderack = new Coderack(this, debug);
		var pb = new PerceptionBehavior(this.coderack);
		pb.addAttribute('shape');
		pb.addAttribute('stability');
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
			console.log('correct solution:', sol.describe());
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
		if (this.debug) console.log('inserted',codelet.name,'with urgency',urgency);
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

	Coderack.prototype.runBehaviors = function() {
		this.behaviors.forEach(function(b) {
			if (this.debug) console.log('running', b.name);
			b.run();
		});
	}

	Coderack.prototype.runCodelet = function() {
		if (this.length==0) { console.log('no codelet to run'); return false }
		var cdl = this.select();
		if (this.debug) console.log('running', cdl.name);
		cdl.run();
		this.splice(this.indexOf(cdl), 1);
	}

	/// Picks a random codelet, runs it and removes it.
	Coderack.prototype.step = function() {
		this.runBehaviors();
		this.runCodelet();
	}


	/// Mixin Pattern, call asActivatible.call(TargetClass.prototype);
	var asActivatible = function() {
	  this._activity = 0;
	  var thiz = this;

	  this.setActivity = function(activity) { thiz._activity = activity }
	  this.getActivity = function() { return thiz._activity }

	  this.incActivity = function(d) {
	  	thiz._activity = Math.min(100, thiz._activity + (d || 10));
	  }

	  this.decActivity = function(d) {
	  	thiz._activity = Math.max(0, thiz._activity - (d || 10));
	  }

	  /// Random result, based on activity (100 => always true, 0 => always false).
	  this.isActive = function() {
	  	return (Math.random() < (thiz._activity/100));
	  }

	  return this;
	};


	/// Capsulates the perception behavior. It will create new codelets based
	/// on the activities of the registered attributes.
	PerceptionBehavior = function(coderack) {
		this.attrs = [];
		this.cr = coderack;
		this.name = 'PerceptionBehavior';
	}
	PerceptionBehavior.prototype.describe = function() {
		var out = [];
		this.attrs.forEach(function (attr) { out.push(attr.prototype.key + ': ' + attr.prototype.getActivity()) });
		console.log(out.join(', '));
	}
	PerceptionBehavior.prototype.addAttribute = function(key) {
		var attr = pbpSettings.obj_attrs[key];
		if (!('activity' in attr)) asActivatible.call(attr.prototype);
		attr.prototype.setActivity(50);
		this.attrs.push(attr);
	}
	PerceptionBehavior.prototype.run = function() {
		for (var i=0; i<this.attrs.length; i++) {
		  var attr = this.attrs[i];
		  // if its active, add a perception codelet
		  if (attr.prototype.isActive()) {
		  	this.cr.insert(new AttrCodelet(this.cr, attr.prototype.key));
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
		this.name = 'AttrCodelet';
		this.coderack = coderack;
		this.ws = coderack.ws;
	}
	AttrCodelet.prototype.run = function() {
		var on;
		if (!this.target) on = this.ws.getRandomObject();
		else if (this.target instanceof SceneNode) on = this.ws.getRandomObject(this.target);
		else if (this.target instanceof ObjectNode) on = this.target;
		if (!on) return false;
		var attr;
		if (attr = on.get(this.attr_key, {from_cache: true})) {
			// was already perceived, decrease activity of attribute
			//attr.decActivity();
		} else {
			// is perceived now, increase activity of attribute
			attr = on.get(this.attr_key);
			attr.incActivity();
		}
	  // with probability of 0.5 spawn an matching Hypothesis Codelet
		if (Math.random() < 0.5) {
			var sn = on.scene_node;
			var hypc = new HypAttrCodelet(this.coderack, null, attr, sn.oracle.curr_state, sn.side);
			this.coderack.insert(hypc, 100);
		}
		return true;
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
		this.name = 'HypAttrCodelet';
		this.coderack = coderack;
		this.ws = coderack.ws;
	}
	HypAttrCodelet.prototype.run = function() {
		if (!this.mode) this.mode = Random.pick_uniform(['all', 'first']);
		if (!this.side) this.side = Random.pick_uniform(['left', 'right']);
		if (!this.time) this.time = Random.pick_uniform(['start', 'end']);
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
