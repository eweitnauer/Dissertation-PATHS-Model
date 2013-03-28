OnGroundAttribute = function(obj, scene_node) {
  this.name = "on-ground";
  this.constant = false;
  this.ground = scene_node.ground;
  this.perceive(obj);
}

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