var b2Body = Box2D.Dynamics.b2Body
   ,b2World = Box2D.Dynamics.b2World
   ,b2Transform = Box2D.Common.Math.b2Transform
   ,b2Sweep = Box2D.Common.Math.b2Sweep
   ,b2DistanceInput = Box2D.Collision.b2DistanceInput
   ,b2DistanceOutput = Box2D.Collision.b2DistanceOutput
   ,b2DistanceProxy = Box2D.Collision.b2DistanceProxy
   ,b2SimplexCache = Box2D.Collision.b2SimplexCache
   ,b2Distance = Box2D.Collision.b2Distance;


/// Returns all objects grouped by touch. E.g "A  BC" will be returned as [[A], [B,C]].
/// There is always the world.m_groundBody in each world (used as absolute reference for some joints),
/// we just ignore it. We also ignore the ground (any static objects).
b2World.prototype.getTouchGroups = function() {
  var res = [], touches = [], bodies = [];
  // collect non-static bodies
  for (var b1 = this.m_bodyList; b1; b1 = b1.m_next) {
    if (b1.GetType() == b2Body.b2_staticBody) continue;
    bodies.push(b1);
  }
  // link all non-static bodies which touch
  for (var c = this.GetContactList(); c; c=c.m_next) {
    if (!c.IsTouching()) continue;
    var a = c.m_fixtureA.m_body, b = c.m_fixtureB.m_body;
    if (a.GetType() == b2Body.b2_staticBody || b.GetType() == b2Body.b2_staticBody) continue;
    touches.push([a, b]);
  }
  return group_connected(bodies, touches);
}

/// Returns a list with all touched bodies, possibly including the ground.
b2Body.prototype.getTouchedBodies = function() {
  var res = [];
  var gb = this.m_world.m_groundBody;
  for (var c = this.m_world.GetContactList(); c; c=c.m_next) {
    if (!c.IsTouching()) continue;
    var a = c.m_fixtureA.m_body, b = c.m_fixtureB.m_body;
    if (a != this && b != this) continue;
    if (a == gb || b == gb) continue;
    res.push(a == this ? b : a);
  }
  return res;
}

/// Returns the nodes grouped by connection. If there is a link path from node n1
/// to node n2, then they are put into the same group. The nodes must be objects.
function group_connected(nodes, links) {
  var res=[];
  for (var i=0; i<nodes.length; i++) {
    res.push([nodes[i]]);
    nodes[i]._group_ = i;
  }
  for (var i=0; i<links.length; i++) {
    var n1 = links[i][0], n2 = links[i][1];
    var g1 = n1._group_, g2 = n2._group_;
    if (g1 == g2) continue;
    // put all objects from group g2 into g1
    for (var j=0; j<res[g2].length; j++) {
      var n3 = res[g2][j];
      n3._group_ = g1;
      res[g1].push(n3);
    }
    res[g2] = [];
  }
  for (var i=0; i<nodes.length; i++) delete nodes[i]._group_;
  return res.filter(function(x){return x.length});
}

/// Returns the minimal distance between this and the passed body.
b2Body.prototype.distance = function(other) {
  var dist_fn = function(shape1, transform1, shape2, transform2) {
    var input = new b2DistanceInput();
    input.proxyA = new b2DistanceProxy();
    input.proxyA.Set(shape1);
    input.proxyB = new b2DistanceProxy();
    input.proxyB.Set(shape2);
    input.transformA = transform1;
    input.transformB = transform2;
    input.useRadii = true;
    var simplexCache = new b2SimplexCache();
    simplexCache.count = 0;
    var output = new b2DistanceOutput();
    b2Distance.Distance(output, simplexCache, input);
    return output.distance;
  }
  var min_dist = Infinity;
  for (var fix1=this.m_fixtureList; fix1; fix1=fix1.m_next) {
    for (var fix2=other.m_fixtureList; fix2; fix2=fix2.m_next) {
      var dist = dist_fn(fix1.m_shape, this.GetTransform(), fix2.m_shape, other.GetTransform())
      if (min_dist > dist) min_dist = dist;
    }
  }
  return min_dist;
}

function b2BodyState(body) {
  this.Init(body);
}

b2BodyState.prototype.Init = function(body) {
  this.m_flags = body.m_flags;
  this.m_xf = new b2Transform(); this.m_xf.Set(body.m_xf);
  this.m_sweep = new b2Sweep(); this.m_sweep.Set(body.m_sweep);
  this.m_linearVelocity = body.m_linearVelocity.Copy();
  this.m_angularVelocity = body.m_angularVelocity;
	this.m_linearDamping = body.m_linearDamping;
  this.m_angularDamping = body.m_angularDamping;
  this.m_force = body.m_force.Copy();
  this.m_torque = body.m_torque;
	this.m_sleepTime = body.m_sleepTime;
	this.m_type = body.m_type;
	this.m_mass = body.m_mass;
	this.m_invMass = body.m_invMass;
	this.m_I = body.m_I;
	this.m_invI = body.m_invI;
	this.m_inertiaScale = body.m_inertiaScale;
	this.m_islandIndex = body.m_islandIndex;
}

b2BodyState.prototype.Apply = function(body) {
  if ((this.m_flags & b2Body.e_activeFlag) == b2Body.e_activeFlag) {
    body.SetActive(true);
  }
  body.m_flags = this.m_flags;
  body.m_xf.Set(this.m_xf);
  body.m_sweep.Set(this.m_sweep);
  body.m_linearVelocity = this.m_linearVelocity.Copy();
  body.m_angularVelocity = this.m_angularVelocity;
	body.m_linearDamping = this.m_linearDamping;
  body.m_angularDamping = this.m_angularDamping;
  body.m_force = this.m_force.Copy();
  body.m_torque = this.m_torque;
	body.m_sleepTime = this.m_sleepTime;
	body.m_type = this.m_type;
	body.m_mass = this.m_mass;
	body.m_invMass = this.m_invMass;
	body.m_I = this.m_I;
	body.m_invI = this.m_invI;
	body.m_inertiaScale = this.m_inertiaScale;
	body.m_islandIndex = this.m_islandIndex;
}

b2Body.prototype.PushState = function() {
  if (!this.bodystates) this.bodystates = [];
  this.bodystates.push(new b2BodyState(this));
}

b2Body.prototype.PopState = function() {
  this.bodystates.pop().Apply(this);
}

/// Pushes the states of all dynamic bodies.
b2World.prototype.PushState = function() {
  for (var b = this.m_bodyList; b; b=b.m_next) {
    if (b.m_type == b2Body.b2_dynamicBody) b.PushState();
  }
}

/// Pops the states of all dynamic bodies.
b2World.prototype.PopState = function() {
  for (var b = this.m_bodyList; b; b=b.m_next) {
    if (b.m_type == b2Body.b2_dynamicBody) b.PopState();
  }
}