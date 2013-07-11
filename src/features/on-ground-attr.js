OnGroundAttribute = function(obj) {
	this.ground = obj.object_node.scene_node.ground;
  this.perceive(obj);
}
OnGroundAttribute.prototype.key = "on_ground";
OnGroundAttribute.prototype.constant = false;

OnGroundAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = (new TouchRelationship(this.obj, this.ground)).val;
}

OnGroundAttribute.prototype.get_activity = function() {
  return this.val == '?' ? 0 : this.val;
}

OnGroundAttribute.prototype.get_label = function() {
  return 'on-ground';
}