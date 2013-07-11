TopMostAttribute = function(obj) {
  this.adaptDomain(obj.object_node.scene_node.objs);
  this.perceive(obj);
}
TopMostAttribute.prototype.key = "top_most";
TopMostAttribute.prototype.constant = false;

TopMostAttribute.prototype.adaptDomain = function(objs) {
  var best, best_obj = null;
  for (var i=0; i<objs.length; i++) {
    if (!(objs[i] instanceof ObjectNode)) continue;
    var y = objs[i].obj.phys_obj.GetPosition().y;
    if (!best_obj || best > y) {
      best_obj = objs[i];
      best = y;
    }
  }
	this.topmost_y = best_obj.obj.y;
}

TopMostAttribute.prototype.membership = function(x) {
  return CloseRelationship.membership(2.5*Math.abs(this.val-this.topmost_y));
}

TopMostAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = obj.y; // y gets smaller towards the top
}

TopMostAttribute.prototype.get_activity = function() {
  return this.membership(this.val);
}

TopMostAttribute.prototype.get_label = function() {
  return 'top-most';
}