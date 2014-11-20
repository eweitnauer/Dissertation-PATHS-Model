/// The label is 'supports'. The activity can have four levels:
/// 1.0 ... A directly supports B
/// 0.7 ... A indirectly supports B
/// 0.4 ... A stabilizes B
/// 0   ... A does not support B
/// See the checkSupport method for more details.
/// Which activity is still considered as active will depend on the context.
SupportsRelationship = function(obj, other) {
  this.perceive(obj, other);
}
SupportsRelationship.prototype.key = "supports";
SupportsRelationship.prototype.targetType = 'obj';
SupportsRelationship.prototype.arity = 2;
SupportsRelationship.prototype.symmetry = false;
SupportsRelationship.prototype.constant = false;

/// Returns an SupportsRelation instance, which is the perception of how well the
/// passed object supports the other object.
SupportsRelationship.prototype.perceive = function(obj, other) {
  this.obj = obj;
  this.other = other;
  this.val = this.checkSupports(obj.object_node, other.object_node, obj.object_node.scene_node.oracle);
}

SupportsRelationship.prototype.get_activity = function() {
  if (this.val == 'directly') return 1;
  if (this.val == 'indirectly') return 0.7;
  if (this.val == 'stabilizes') return 0.4;
  if (this.val == 'not') return 0;
  throw "unknown support value";
}

SupportsRelationship.prototype.get_label = function() {
	return 'supporting';
}

/// Returns whether the object node A 'directly, 'indirectly' supports the
/// object node B or merely 'stabilizes' it or does 'not' support it at all.
/// 1) A 'directly' supports B:
///   A touches B and B is not starting to move but it is with A removed
/// 2) A 'indirectly' supports B:
///   A does not touch B and B is not starting to move but it is with A removed
/// 3) A 'stabilizes' B:
///   B is on-top-of A, but does not move, also when A is removed OR
///   (B is stable, but becomes unstable if A is removed -- not implemented)
SupportsRelationship.prototype.checkSupports = function(A, B, oracle) {
  var moves_threshold   = 0.5
     ,touches_threshold = 0.5
     ,ontopof_threshold = 0.5
     ,close_threshold   = 0.5;

  if (A === B) return 'not';

	// no support if B moves anyway
  if (B.getAttr('moves').get_activity() > moves_threshold) return 'not';

  // is A touching B?
  var touch = A.getRel('touch', {other: B}).get_activity() > touches_threshold;

  // is B moving when A is removed?
  var bodyA = A.obj.phys_obj;
  var before = function() { oracle.pscene.wakeUp(); bodyA.SetActive(false); }
  var B_moves = oracle.analyzeFuture(0, before, function() {
    var moves_attr = new MovesAttribute(B.obj);
    return moves_attr.get_activity() > moves_threshold;
  });

  if (B_moves) return touch ? 'directly': 'indirectly';

  // B does not depend on A, but is it on-top-of A?
  var ontop = B.getRel('on_top_of', {other: A}).get_activity() > ontopof_threshold;
  if (ontop) return 'stabilizes';

  // is B near A and stable, but unstable without A?
  var near = A.getRel('close', {other: B}).get_activity() > close_threshold;
  if (near) {
    var B_stable = B.getAttr('stability').get_label() == 'stable';
    if (B_stable) {
      var B_stable_without_A = oracle.analyzeFuture(0, before, function() {
        var stable_attr = new StabilityAttribute(B.obj);
        return stable_attr.get_label() == 'stable';
      });
      if (!B_stable_without_A) return 'stabilizes';
    }
  }

  return 'not';
}
