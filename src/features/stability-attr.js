StabilityAttribute = function() {
  this.name = 'stability';
  this.type = 'nominal';
  this.labels = ['stable', 'unstable'];
  this.val = '?';
}

/// Returns an StabilityAttribute instance, which is the perception of the passed
/// object's stability. Possible values are 'very stable', 'stable', 'unstable'
/// and 'very unstable'.
StabilityAttribute.perceive = function(obj) {
  var sa = new StabilityAttribute();
  var val = checkStability(obj.phys_obj);
  if (val == 'stable') sa.val = 'stable';
  if (val == 'unstable' || val == 'moving') sa.val = 'unstable';
  return sa;
}