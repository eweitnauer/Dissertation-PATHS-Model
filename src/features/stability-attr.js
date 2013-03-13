StabilityAttribute = function(obj) {
  this.name = 'stable';
  this.obj = obj;
  this.val = '?';
}

/// Returns an StabilityAttribute instance, which is the perception of the passed
/// object's stability. Possible values are 'very stable', 'stable', 'unstable'
/// and 'very unstable'.
StabilityAttribute.perceive = function(obj) {
  var sa = new StabilityAttribute(obj);
  var val = checkStability(obj.phys_obj);
  if (val == 'stable') sa.val = 'stable';
  if (val == 'unstable' || val == 'moving') sa.val = 'unstable';
  return sa;
}

StabilityAttribute.prototype.get_activity = function() {
  return this.val == '?' ? 0 : 1;
}

StabilityAttribute.prototype.get_label = function() {
  return this.val;
}