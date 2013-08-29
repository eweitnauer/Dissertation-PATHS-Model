OnGroundAttribute = function(obj) {
	this.ground = obj.object_node.scene_node.ground;
  this.perceive(obj);
}
OnGroundAttribute.prototype.key = "on_ground";
OnGroundAttribute.prototype.constant = false;

OnGroundAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  var touch = obj.object_node.getRel('touch', {other: this.ground.object_node});
  this.val = touch.get_activity();
}

OnGroundAttribute.prototype.get_activity = function() {
  return this.val == '?' ? 0 : this.val;
}

OnGroundAttribute.prototype.get_label = function() {
  return 'on-ground';
}