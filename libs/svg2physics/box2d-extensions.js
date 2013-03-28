var b2Body = Box2D.Dynamics.b2Body
   ,b2World = Box2D.Dynamics.b2World
   ,b2Transform = Box2D.Common.Math.b2Transform
   ,b2Sweep = Box2D.Common.Math.b2Sweep
   ,b2DistanceInput = Box2D.Collision.b2DistanceInput
   ,b2DistanceOutput = Box2D.Collision.b2DistanceOutput
   ,b2DistanceProxy = Box2D.Collision.b2DistanceProxy
   ,b2SimplexCache = Box2D.Collision.b2SimplexCache
   ,b2Distance = Box2D.Collision.b2Distance
   ,b2Vec2 = Box2D.Common.Math.b2Vec2;

b2Vec2.prototype.Transformed = function(xf) {
  return new b2Vec2(this.x*xf.R.col1.x + this.y*xf.R.col2.x + xf.position.x,
                    this.x*xf.R.col1.y + this.y*xf.R.col2.y + xf.position.y);
}

b2Body.prototype.IsCircle = function() {
  return this.m_fixtureList.m_shape instanceof b2CircleShape && this.m_fixtureList.m_next == null;
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
  if ((this.m_flags & b2Body.e_activeFlag) == b2Body.e_activeFlag) {
    body.SetActive(true);
  }
  if ((this.m_flags & b2Body.e_awakeFlag) == b2Body.e_awakeFlag) {
    body.SetAwake(true);
  }
  body.m_flags = this.m_flags;
}

function b2WorldState(world) {
  this.Init(world);
}

b2WorldState.prototype.Init = function(world) {
  // curr_time is no internal property, we have to keep track of it
  // ourselves each time we step the world
  this.curr_time = world.curr_time;
}

b2WorldState.prototype.Apply = function(world) {
  world.curr_time = this.curr_time;
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
  if (!this.worldstates) this.worldstates = [];
  this.worldstates.push(new b2WorldState(this));
  for (var b = this.m_bodyList; b; b=b.m_next) {
    if (b.m_type == b2Body.b2_dynamicBody) b.PushState();
  }
}

/// Pops the states of all dynamic bodies.
b2World.prototype.PopState = function() {
  this.worldstates.pop().Apply(this);
  for (var b = this.m_bodyList; b; b=b.m_next) {
    if (b.m_type == b2Body.b2_dynamicBody) b.PopState();
  }
}

