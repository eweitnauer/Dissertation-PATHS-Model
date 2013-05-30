StabilityAttribute = function(obj) {
  this.perceive(obj);
}
StabilityAttribute.prototype.key = 'stability';
StabilityAttribute.prototype.constant = false;

/// Returns an StabilityAttribute instance, which is the perception of the passed
/// object's stability. Possible values are 'very stable', 'stable', 'unstable'
/// and 'very unstable'.
StabilityAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  var val = checkStability(obj.phys_obj);
  if (val == 'stable') this.val = 'stable';
  if (val == 'unstable' || val == 'moving') this.val = 'unstable';
}

StabilityAttribute.prototype.get_activity = function() {
  return this.val == '?' ? 0 : 1;
}

StabilityAttribute.prototype.get_label = function() {
  return this.val;
}