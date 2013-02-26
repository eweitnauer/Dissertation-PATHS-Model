var b2Body = Box2D.Dynamics.b2Body
   ,b2World = Box2D.Dynamics.b2World
   ,b2Transform = Box2D.Common.Math.b2Transform
   ,b2Sweep = Box2D.Common.Math.b2Sweep;


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