// Copyright 2013, Erik Weitnauer.

var Solution = {};

/// Solution of the type "All/a/the object/group is X"
/// main_side is either 'left' or 'right' (default: 'left').
Solution.IsX = function(sel, main_side) {
	this.sel = sel;
	this.main_side = main_side || 'left';
	this.other_side = {left: 'right', right: 'left'}[this.main_side];
}

/// Returns true if all scenes match the respecive selector.
Solution.IsX.prototype.check = function(scenes_l, scenes_r) {
	var a = this.main_side == 'left'  ? scenes_l : scenes_r
	   ,b = this.main_side == 'right' ? scenes_l : scenes_r;
	var sel = this.sel;
	return a.every(function (scene) {
			var objs = sel.select(scene.objs, scene);
			var res = sel.mode == 'all' ? objs.length == scene.objs.length
																	: objs.length > 0;
			scene.fits_solution = res;
			return res;
	  }) && b.every(function (scene) {
	  	var objs = sel.select(scene.objs, scene);
	  	var res = sel.mode == 'all' ? objs.length < scene.objs.length
	  														  : objs.length == 0;
	  	scene.fits_solution = res;
	  	return res;
	  });
};

/// Returns a human readable description of the solution.
Solution.IsX.prototype.describe = function() {
	return "Only in the " + this.main_side + " scenes, " + this.sel.describe2();
};




/// Solution of the type "All/a/the object/group is X"
/// main_side is either 'left' or 'right' (default: 'left').
Solution.XIsY = function(sel1, sel2, main_side) {
	this.sel1 = sel1;
	this.sel2 = sel2;
	this.main_side = main_side || 'left';
	this.other_side = {left: 'right', right: 'left'}[this.main_side];
}

/// Returns true if all scenes match the respecive selector.
Solution.XIsY.prototype.check = function(scenes_l, scenes_r) {
	var a = this.main_side == 'left'  ? scenes_l : scenes_r
	   ,b = this.main_side == 'right' ? scenes_l : scenes_r;
	var sel1 = this.sel1, sel2 = this.sel2;
	return a.every(function (scene) {
			var objs = sel1.select(scene.objs, scene);
			var okay = sel1.mode == 'unique' ? objs.length == 1
							                         : objs.length > 0;
			if (okay) {
				var objs2 = sel2.select(objs, scene);
				okay = sel2.mode == 'all' ? objs2.length == objs.length
							                    : (objs2.length > 0 || sel2.mode == 'group');
			}
			scene.fits_solution = okay;
			return okay;
	  }) && b.every(function (scene) {
	  	var objs = sel1.select(scene.objs, scene);
			var okay = sel1.mode == 'unique' ? objs.length == 1
							                         : (objs.length > 0 || sel2.mode == 'group');
			if (okay) {
				var objs2 = sel2.select(objs, scene);
				okay = sel2.mode == 'all' ? objs2.length < objs.length
							                    : objs2.length == 0;
			}
			scene.fits_solution = okay;
			return okay;
	  });
};

/// Returns a human readable description of the solution.
Solution.XIsY.prototype.describe = function() {
	return "Only in the " + this.main_side + " scenes, " + this.sel1.describe() +
	       (this.sel1.mode == "all" ? " are " : " is ") + this.sel2.describe2(true);
};

// /// Solution of the type "There is always an xxx on the main_side, but not on the other_side." ///////////////////////////
// /// main_side is either 'left' or 'right' (default: 'left').
// Solution.Exists = function(sel, main_side) {
// 	this.sel = sel;
// 	this.main_side = main_side || 'left';
// 	this.other_side = {left: 'right', right: 'left'}[this.main_side];
// }

// /// Returns true if all scenes match the respecive selector.
// Solution.Exists.prototype.check = function(scenes_l, scenes_r) {
// 	var a = this.main_side == 'left'  ? scenes_l : scenes_r
// 	   ,b = this.main_side == 'right' ? scenes_l : scenes_r;
// 	var thiz = this;
// 	return a.every(function (scene) { return thiz.sel.selectFirst(scene) }) &&
// 	    	 b.every(function (scene) { return !thiz.sel.selectFirst(scene) });
// };

// /// Returns a human readable description of the solution.
// Solution.Exists.prototype.describe = function() {
// 	return "There is an object that is " + this.sel.describe() +
// 	       " in the " + this.main_side + " scenes, but not in the " +
// 	       {left: 'right', right: 'left'}[this.main_side] + " scenes";
// };


// /// Solution of the type "On the main_side, every X is Y." ///////////////////////////
// /// main_side is either 'left' or 'right' (default: 'left').
// Solution.All = function(sel, desc, main_side) {
// 	this.main_side = main_side || 'left';
// 	this.other_side = {left: 'right', right: 'left'}[this.main_side];
// 	this.sel = sel || new ElementSelector();
// 	this.desc = desc;
// }

// /// Returns true if all scenes match the respecive selector.
// Solution.All.prototype.check = function(scenes_l, scenes_r) {
// 	var thiz = this;
// 	var f = function(sn, value) {
// 		var ons = thiz.sel.selectAll(sn), N = ons.length;
// 		return N != 0 && thiz.desc.matchesAll(ons) == value;
// 	}
// 	return scenes_l.every(function (scene) { return f(scene, thiz.main_side == 'left')  }) &&
// 				 scenes_r.every(function (scene) { return f(scene, thiz.main_side == 'right') });
// };

// /// Returns a human readable description of the solution.
// Solution.All.prototype.describe = function() {
// 	return "On the "  +this.main_side+  " every " +
// 	       (this.sel.empty() ? 'object' : "[" + this.sel.describe() + "]") +
// 	       " is " + this.desc.describe();
// };


// /// Solution of the type "On the main_side, the X is R to the Y." ///////////////////////////
// /// main_side is either 'left' or 'right' (default: 'left').
// Solution.HasRelation = function(psel, main_side) {
// 	this.main_side = main_side || 'left';
// 	this.other_side = {left: 'right', right: 'left'}[this.main_side];
// 	this.psel = psel;
// }

// /// Returns true if there is exactly one X, one Y and they are in relation R to
// /// each other.
// Solution.HasRelation.prototype.check = function(scenes_l, scenes_r) {
// 	var thiz = this;
// 	var for_left = this.main_side == 'left';
// 	return scenes_l.every(function (scene) {
// 				   return for_left == (thiz.psel.selectThisAndThis(scene)!=null)
// 				 }) &&
// 				 scenes_r.every(function (scene) {
// 				   return for_left == (thiz.psel.selectThisAndThis(scene)==null)
// 				 });
// };

// /// Returns a human readable description of the solution.
// Solution.HasRelation.prototype.describe = function() {
// 	return "On the "  +this.main_side+  " the " + this.psel.describe();
// };


// /// Solution of the type "On the main_side, the X is Y." ///////////////////////////
// /// main_side is either 'left' or 'right' (default: 'left').
// Solution.HasAttribute = function(sel, desc, main_side) {
// 	this.main_side = main_side || 'left';
// 	this.other_side = {left: 'right', right: 'left'}[this.main_side];
// 	this.sel = sel || new ElementSelector();
// 	this.desc = desc;
// }

// /// Returns true if all scenes match the respecive selector.
// Solution.HasAttribute.prototype.check = function(scenes_l, scenes_r) {
// 	var thiz = this;
// 	var f = function(sn, value) {
// 		var on = thiz.sel.selectThis(sn);
// 		if (!on) return false;
// 		return value == thiz.desc.matches(on);
// 	}
// 	return scenes_l.every(function (scene) { return f(scene, thiz.main_side == 'left')  }) &&
// 				 scenes_r.every(function (scene) { return f(scene, thiz.main_side == 'right') });
// };

// /// Returns a human readable description of the solution.
// Solution.HasAttribute.prototype.describe = function() {
// 	return "On the "  +this.main_side+  " the " +
// 	       (this.sel.empty() ? 'object' : "[" + this.sel.describe() + "]") +
// 	       " is " + this.desc.describe();
// };


// /// Solution of the type "On the main_side, the group of all objects is X." ///////////////////////////
// /// main_side is either 'left' or 'right' (default: 'left').
// Solution.SceneHasAttribute = function(desc, main_side) {
// 	this.main_side = main_side || 'left';
// 	this.other_side = {left: 'right', right: 'left'}[this.main_side];
// 	this.desc = desc;
// }

// /// Returns true if all scenes match the respecive selector.
// Solution.SceneHasAttribute.prototype.check = function(scenes_l, scenes_r) {
// 	var thiz = this;
// 	var f = function(sn, value) {
// 		var on = thiz.sel.selectThis(sn);
// 		if (!on) return false;
// 		return value == thiz.desc.matches(on);
// 	}
// 	return scenes_l.every(function (scene) { return f(scene, thiz.main_side == 'left')  }) &&
// 				 scenes_r.every(function (scene) { return f(scene, thiz.main_side == 'right') });
// };

// /// Returns a human readable description of the solution.
// Solution.HasAttribute.prototype.describe = function() {
// 	return "On the "  +this.main_side+  " the " +
// 	       (this.sel.empty() ? 'object' : "[" + this.sel.describe() + "]") +
// 	       " is " + this.desc.describe();
// };

// /// Solution of the type "The xxx object is yyy on the main_side and zzz on the other_side." ///////////////////////////
// /// main_side is either 'left' or 'right' (default: 'left').
// Solution.X_is_A_vs_B = function(selx, sela, selb, main_side) {
// 	this.main_side = main_side || 'left';
// 	this.other_side = {left: 'right', right: 'left'}[this.main_side];
// 	this.sel = {};
// 	this.sel[this.main_side] = sela;
// 	this.sel[this.other_side] = selb;
// 	this.sel.x = selx;
// }

// /// Returns true if all scenes match the respecive selector.
// Solution.X_is_A_vs_B.prototype.check = function(scenes_l, scenes_r) {
// 	var thiz = this;
// 	return (
// 		scenes_l.every(function (scene) {
// 			var xs = thiz.sel.x.select(scene);
// 			return (xs.length == 1 &&  thiz.sel.left.matches(xs[0])
// 				                     && !thiz.sel.right.matches(xs[0]));
// 		}) &&
// 		scenes_r.every(function (scene) {
// 			var xs = thiz.sel.x.select(scene);
// 			return (xs.length == 1 && !thiz.sel.left.matches(xs[0])
// 				                     &&  thiz.sel.right.matches(xs[0]));
// 		}));
// };

// /// Returns a human readable description of the solution.
// Solution.X_is_A_vs_B.prototype.describe = function() {
// 	return "The " + this.sel.x.describe(true) + " object is " +
// 	       this.sel[this.main_side].describe(true)  + " in all " +this.main_side+ " scenes and " +
// 	       this.sel[this.other_side].describe(true) + " in all " +this.other_side+ " scenes.";
// };
