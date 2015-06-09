TopMostAttribute = function(obj) {
  this.perceive(obj);
}
TopMostAttribute.prototype.key = "top_most";
TopMostAttribute.prototype.targetType = 'obj';
TopMostAttribute.prototype.arity = 1;
TopMostAttribute.prototype.constant = false;

TopMostAttribute.prototype.adaptDomain = function(objs) {
  if (objs.length === 0) return;
  var best, best_obj = null, phys_scale = objs[0].obj.phys_scale;
  for (var i=0; i<objs.length; i++) {
    if (!(objs[i] instanceof ObjectNode)) continue;
    var aabb = objs[i].obj.phys_obj.GetAABB();
    var y = aabb.lowerBound.y;
    if (this.obj === objs[i].obj) this.val = y/phys_scale;
    if (!best_obj || best > y) {
      best_obj = objs[i];
      best = y;
    }
  }
	this.topmost_y = best/phys_scale;
}

TopMostAttribute.prototype.membership = function(x) {
  return CloseRelationship.membership(3.5*Math.abs(this.val-this.topmost_y));
}

TopMostAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.adaptDomain(obj.object_node.scene_node.objs);
}

TopMostAttribute.prototype.get_activity = function() {
  return this.membership(this.val);
}

TopMostAttribute.prototype.get_label = function() {
  return 'top-most';
}
