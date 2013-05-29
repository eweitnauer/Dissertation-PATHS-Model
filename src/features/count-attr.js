CountAttribute = function(objs) {
  this.name = 'count';
  this.constant = true;
  this.perceive(objs);
}

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