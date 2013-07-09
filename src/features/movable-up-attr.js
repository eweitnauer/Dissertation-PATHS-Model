/// For now, this is a all or nothing decision between "can be moved up" or "can't be moved up".
/// Depends on whether the after applying a upward directed force for 5 seconds the object touches
/// the upper frame.
MovableUpAttribute = function(obj) {
  this.perceive(obj);
}
MovableUpAttribute.prototype.key = 'can_move_up';
MovableUpAttribute.prototype.constant = false;

/// Returns an MovableUpAttribute instance, which is the perception of whether the passed
/// object can be moved up. Possible values are 1 or 0.
MovableUpAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = this.checkMovability('up', obj.phys_obj, obj.object_node.scene_node.oracle);
}

MovableUpAttribute.prototype.get_activity = function() {
  return this.val ? 1 : 0;
}

MovableUpAttribute.prototype.get_label = function() {
	return 'can-move-up';
}

/// Returns true if the object can be moved towards the passed direction, one of
/// 'up', 'left' or 'right'. This is the case if pulling the object with a small force
/// for 4 seconds into the respective direction will result in the object beeing at
/// the respective edge of the frame or having moved substantially far in the direction.
/// For now only works for 'up'.
MovableUpAttribute.prototype.checkMovability = function(dir, body, oracle) {
	if (oracle.isStatic(body)) return false;

  var f = new b2Vec2(0, -body.GetMass()*12);
  //if (dir == 'up') f = new b2Vec2(0, -body.GetMass()*12);
  //else if (dir == 'left') f = new b2Vec2(-body.GetMass()*2, 0);
  //else if (dir == 'right') f = new b2Vec2(body.GetMass()*2, 0);
  //else throw "unknown direction '" + dir + "'";

  // apply force to the body (will be cleared on reset after analyzeFuture automatically)
  var pull = function() {
    body.SetSleepingAllowed(false);
    body.ApplyForce(f, body.GetWorldCenter());
  }

  return oracle.analyzeFuture(2.5, pull, function() {
    // check whether object is close to top of frame
    var res = oracle.getTouchedBodiesWithPos(body);
    return res.some(function (e) {
      if (e.body.master_obj.id !== "|") return false;
      for (var i=0; i<e.pts.length; i++) {
        if (e.pts[i].y < 0.1) return true;
      }
    });
  });
}