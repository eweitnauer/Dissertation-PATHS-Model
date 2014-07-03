/// Labels are only 'stable' or 'unstable', but internally there are four values:
/// 'moving', 'unstable', 'slightly unstable' and 'stable'. The mapping of values
/// to labels should depend on the context later, but is fixed for now.
StabilityAttribute = function(obj) {
  this.perceive(obj);
}
StabilityAttribute.prototype.key = 'stability';
StabilityAttribute.prototype.targetType = 'obj';
StabilityAttribute.prototype.arity = 1;
StabilityAttribute.prototype.constant = false;

/// Returns an StabilityAttribute instance, which is the perception of the passed
/// object's stability. Possible values are 'very stable', 'stable', 'unstable'
/// and 'very unstable'.
StabilityAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = this.checkStability(obj.phys_obj, obj.object_node.scene_node.oracle);
}

StabilityAttribute.prototype.get_activity = function() {
  return this.val ? 1 : 0;
}

StabilityAttribute.prototype.get_label = function() {
	if (this.val == 'stable' || this.val == 'slightly unstable') return 'stable';
	if (this.val == 'moving' || this.val == 'unstable') return 'unstable';
}

/// Returns whether the object is 'stable', 'unstable' or 'moving'.
/// An object is 'moving', if its speed is above 0.25. An object is
/// considered 'stable' if, after pushing it with an impulse as big as its mass,
/// after 0.3 seconds of simulation, its position changed less than 0.2, its rotation
/// changed less than 9 degrees and its speed is less than 0.4. If the body is
/// a circle, the rotation must change less than 60 degrees.
/// An object is considered 'slightly unstable' if, after pushing it with an impulse as half as
/// big as its mass, after 0.3 seconds of simulation, it does not exceed 2/3 of the above
/// values.
/// For an static object 'stable' is returned.
StabilityAttribute.prototype.checkStability = function(body, oracle) {
	var max_initial_v = 0.25;
	var max_v = 0.4;
	var max_dx = 0.2;
	var max_drot_circle = 1.047, max_drot = 0.157;
	if (oracle.isStatic(body)) return 'stable';
	var is_stable = function(dir, soft) {
		var rot0 = body.GetAngle();
		var apply_impulse = function() {oracle.applyCentralImpulse(body, dir, soft ? 'small' : 'medium')};
    return oracle.analyzeFuture(0.3, apply_impulse, function() {
    	//console.log('pushing', soft ? 'softly' : '', 'to the', dir);
    	var v = body.m_linearVelocity.Length();
    	var factor = soft ? 2/3 : 1.0;
			//console.log('  speed:',v);
    	if (v >= max_v*factor) return false;
    	var dx = oracle.pscene.getBodyDistance(body);
      //console.log('  dist:',dx);
      if (dx >= max_dx*factor) return false;
      var drot = Point.norm_angle(body.GetAngle() - rot0);
      //console.log('  rot:',drot);
      if ( body.IsCircle() && Math.abs(drot) >= max_drot_circle*factor ||
          !body.IsCircle() && Math.abs(drot) >= max_drot*factor) return false;
      return true;
    });
  }
  // check for 'moving'
  var v = body.m_linearVelocity.Length();
  //console.log('curr. vel.', v);
  if (v > max_initial_v) return 'moving';
  // check for pushing left and right
  if (is_stable('left', false) && is_stable('right', false)) return 'stable';
  if (is_stable('left', true) && is_stable('right', true)) return 'slightly unstable';
  return 'unstable';
}