/// Group attribute, number of objects in the group.
CountAttribute = function(group) {
  this.perceive(group);
}
CountAttribute.prototype.key = "count";
CountAttribute.prototype.targetType = 'group';
CountAttribute.prototype.arity = 1;
CountAttribute.prototype.constant = true;

CountAttribute.prototype.perceive = function(group) {
  this.group = group;
  this.val = group.objs.length;
}

CountAttribute.prototype.get_activity = function() {
  return 1;
}

CountAttribute.prototype.get_label = function() {
	if (this.val < 4) return this.val;
	return ">=4";
}
