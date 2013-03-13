/// -1 (left) ... 0 (center) ... 1 (right)
HorizontalPositionAttribute = function() {
  this.type = "metric";
  this.name = "hpos";
  this.labels = ['left', 'center', 'right'];
  this.val = '?';
}

HorizontalPositionAttribute.perceive = function(obj) {
  var attr = new HorizontalPositionAttribute();
  attr.val = 2*obj.x/100 - 1;
  return attr;
}