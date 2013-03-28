LeftAttribute = function(obj) {
  this.name = "left";
  this.size = 100; // scene size
  this.constant = false;
  this.perceive(obj);
}

LeftAttribute.prototype.membership = function(x) {
	return 1-1/(1+Math.exp(20*(0.4-x/this.size)));
}

LeftAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = obj.x;
}

LeftAttribute.prototype.get_activity = function() {
  return this.membership(this.val);
}

LeftAttribute.prototype.get_label = function() {
  return 'left';
}