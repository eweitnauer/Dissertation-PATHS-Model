TopMostAttribute = function(obj, scene_node) {
  this.name = "top-most";
  this.constant = false;
  this.adaptDomain(scene_node.parts);
  this.perceive(obj);
}

TopMostAttribute.prototype.adaptDomain = function(parts) {
  var best, best_obj = null;
  for (var i=0; i<parts.length; i++) {
    if (!(parts[i] instanceof ObjectNode)) continue;
    var y = parts[i].obj.phys_obj.GetPosition().y;
    if (!best_obj || best > y) {
      best_obj = parts[i];
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