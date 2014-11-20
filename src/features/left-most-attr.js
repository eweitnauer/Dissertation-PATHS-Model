LeftMostAttribute = function(obj) {
  this.adaptDomain(obj.object_node.scene_node.objs);
  this.perceive(obj);
}
LeftMostAttribute.prototype.key = "left_most";
LeftMostAttribute.prototype.targetType = 'obj';
LeftMostAttribute.prototype.arity = 1;
LeftMostAttribute.prototype.constant = false;

LeftMostAttribute.prototype.adaptDomain = function(objs) {
  var best, best_obj = null;
  for (var i=0; i<objs.length; i++) {
    if (!(objs[i] instanceof ObjectNode)) continue;
    var x = objs[i].obj.phys_obj.GetPosition().x;
    if (!best_obj || best > x) {
      best_obj = objs[i];
      best = x;
    }
  }
	this.leftmost_x = best_obj.obj.x;
}

LeftMostAttribute.prototype.membership = function(x) {
  return CloseRelationship.membership(2.5*Math.abs(this.val-this.leftmost_x));
}

LeftMostAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = obj.x;
}

LeftMostAttribute.prototype.get_activity = function() {
  return this.membership(this.val);
}

LeftMostAttribute.prototype.get_label = function() {
  return 'left-most';
}
