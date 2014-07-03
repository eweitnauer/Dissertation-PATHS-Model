RightMostAttribute = function(obj) {
  this.adaptDomain(obj.object_node.scene_node.objs);
  this.perceive(obj);
}
RightMostAttribute.prototype.key = "right_most";
RightMostAttribute.prototype.targetType = 'obj';
RightMostAttribute.prototype.arity = 1;
RightMostAttribute.prototype.constant = false;

RightMostAttribute.prototype.adaptDomain = function(objs) {
  var best, best_obj = null;
  for (var i=0; i<objs.length; i++) {
    if (!(objs[i] instanceof ObjectNode)) continue;
    var x = objs[i].obj.phys_obj.GetPosition().x;
    if (!best_obj || best < x) {
      best_obj = objs[i];
      best = x;
    }
  }
	this.rightmost_x = best_obj.obj.x;
}

RightMostAttribute.prototype.membership = function(x) {
  return CloseRelationship.membership(2.5*Math.abs(this.val-this.rightmost_x));
}

RightMostAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = obj.x;
}

RightMostAttribute.prototype.get_activity = function() {
  return this.membership(this.val);
}

RightMostAttribute.prototype.get_label = function() {
  return 'right-most';
}