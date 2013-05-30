CountAttribute = function(objs) {
  this.perceive(objs);
}
CountAttribute.prototype.key = 'count';
CountAttribute.prototype.constant = true;

CountAttribute.prototype.perceive = function(objs) {
  this.objs = objs;
  this.val = objs.length;
}

CountAttribute.prototype.get_activity = function() {
  return 1;
}

CountAttribute.prototype.get_label = function() {
  return this.val;
}