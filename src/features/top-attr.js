TopAttribute = function(obj, scene_node) {
  this.adaptDomain(scene_node.ground);
  this.perceive(obj);
}
TopAttribute.prototype.key = "top_pos";
TopAttribute.prototype.constant = false;


TopAttribute.prototype.adaptDomain = function(ground) {
	var bb = ground.bounding_box();
	this.maxy = ground.y+bb.y+bb.height;
}

TopAttribute.prototype.membership = function(x) {
	return 1-1/(1+Math.exp(20*(0.45-x/this.maxy)));
}

TopAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = obj.y; // y get smaller towards the top
}

TopAttribute.prototype.get_activity = function() {
  return this.membership(this.val);
}

TopAttribute.prototype.get_label = function() {
  return 'top';
}