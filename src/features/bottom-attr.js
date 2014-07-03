BottomAttribute = function(obj) {
  this.adaptDomain(obj.object_node.scene_node.ground);
  this.perceive(obj);
}
BottomAttribute.prototype.key = "bottom_pos";
BottomAttribute.prototype.targetType = 'obj';
BottomAttribute.prototype.arity = 1;
BottomAttribute.prototype.constant = false;

BottomAttribute.prototype.adaptDomain = function(ground) {
	var bb = ground.bounding_box();
	this.maxy = ground.y+bb.y+bb.height;
}

BottomAttribute.prototype.membership = function(x) {
	return 1-1/(1+Math.exp(20*(0.3-x/this.maxy)));
}

BottomAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = this.maxy-obj.y; // y get smaller towards the top
}

BottomAttribute.prototype.get_activity = function() {
  return this.membership(this.val);
}

BottomAttribute.prototype.get_label = function() {
  return 'bottom';
}