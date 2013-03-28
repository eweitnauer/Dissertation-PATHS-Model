RightAttribute = function(obj) {
  this.name = "right";
  this.size = 100; // scene size
  this.constant = false;
  this.perceive(obj);
}

RightAttribute.prototype.membership = function(x) {
	return 1-1/(1+Math.exp(20*(0.4-x/this.size)));
}

RightAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = this.size-obj.x;
}

RightAttribute.prototype.get_activity = function() {
  return this.membership(this.val);
}

RightAttribute.prototype.get_label = function() {
  return 'right';
}