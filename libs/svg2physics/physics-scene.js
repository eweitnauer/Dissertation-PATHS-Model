/// Written by Erik Weitnauer, 2013.
/** A wrapper around the b2World class */

Box2D.Common.b2Settings.b2_linearSleepTolerance = 0.1 //0.01;
Box2D.Common.b2Settings.b2_angularSleepTolerance = 20.0 / 180.0 * Math.PI //2.0 / 180.0 * b2Settings.b2_pi;

var PhysicsScene = function(world, dt) {
	this.world = world;
	this.world.curr_time = this.world.curr_time || 0;
	this.world.PushState(); // save initial state for reset
	this.dt = dt || 1/50;
	this.onWorldChange = new ListenerPattern(); // Emits world.curr_time each time the world changed.
	this.emit_changes = true; // set to false to stop updating the world change listeners
}

PhysicsScene.prototype.pushState = function() {
	this.world.PushState();
}

PhysicsScene.prototype.popState = function() {
	this.world.PopState();
	if (this.emit_changes) this.onWorldChange.emit(this.world.curr_time);
}

PhysicsScene.prototype.getState = function() {
	return this.world.GetState();
}

PhysicsScene.prototype.setState = function(state) {
	this.world.SetState(state);
	if (this.emit_changes) this.onWorldChange.emit(this.world.curr_time);
}

PhysicsScene.prototype.reset = function() {
	this.popState();
	this.pushState();
}

PhysicsScene.prototype.getTime = function() {
	return this.world.curr_time;
}

PhysicsScene.prototype.seek = function(t) {
	if (this.world.curr_time > t) this.reset();
	this.simulate(t - this.world.curr_time);
}

PhysicsScene.prototype.clearForces = function() {
	this.world.ClearForces();
}

/// dt is optional, returns dt.
PhysicsScene.prototype.step = function(dt) {
	dt = dt || this.dt;
	this.world.Step(dt, 10, 10);
  this.world.curr_time += dt;
  if (this.emit_changes) this.onWorldChange.emit(this.world.curr_time);
  return dt;
}

/// Makes as many steps of this.dt as needed to reach time.
PhysicsScene.prototype.simulate = function(time) {
  var t = 0;
  while (t+this.dt<time) t += this.step();
  var rest = time-t;
  if (rest > 0.001) this.step(rest);
}

/// Simulates until all bodies sleep or max_time (default: Inifinity) is reached. Returns time.
PhysicsScene.prototype.simulateUntilSleep = function(max_time) {
	var max_time = max_time || Infinity;
	var t = 0;
	while (t<=max_time && this.countAwake() > 0) t += this.step();
	return t;
}

/// It saves the world state, calls teh start_callback, simulates the world for the passed
/// time, calls the end_callback and restores the previous world state. Returns the value
/// returned by end_callback.
/// The start_callback can be used to, e.g., apply an impulse. It can also be null.
PhysicsScene.prototype.analyzeFuture = function(time, start_callback, end_callback) {
	if (time < 0) throw "You are mistaking the past for the future."
	var old_emit_changes = this.emit_changes;
	this.emit_changes = false;
	this.pushState();
	if (start_callback) start_callback();
	this.simulate(time);
	var res = end_callback();
	this.popState();
	this.emit_changes = old_emit_changes;
	return res;
};

PhysicsScene.prototype.forEachBody = function(f) {
  for (var b = this.world.m_bodyList; b; b = b.m_next) {
  	if (b.master_obj) f(b);
  }
}

PhysicsScene.prototype.forEachDynamicBody = function(f) {
  for (var b = this.world.m_bodyList; b; b = b.m_next) {
  	if (b.GetType() == b2Body.b2_dynamicBody) f(b);
 	}
}

/// Returns the total kinetic energy of all bodies.
PhysicsScene.prototype.getKineticEnergy = function() {
	var energy = 0;
	this.world.forEachDynamicBody(function(b) {
		energy += 0.5 * (b.m_I*b.m_angularVelocity*b.m_angularVelocity
		                +b.m_mass*b.m_linearVelocity.Length()*b.m_linearVelocity.Length());
	});
	return energy;
}

/// Returns the distance the body has travelled between the passed (old) transformation
/// and the current transformation. For circles, the euclidian distance of the center is
/// returned. For other shapes, the mean distance of all corners' distances is returned.
/// If no transformation is passed, the transformation of the previous body state on its
/// bodystates stack is used.
PhysicsScene.prototype.getBodyDistance = function(body, xf) {
	xf = xf || body.bodystates[body.bodystates.length-1].m_xf
  if (body.m_fixtureList.m_shape.GetType() == b2Shape.e_circleShape) {
    var d = body.m_xf.position.Copy();
    d.Subtract(xf.position);
    return d.Length();
  } else {
    return this.meanPointDistance(body.m_fixtureList.m_shape.GetVertices(), body.m_xf, xf);
  }
}

/// Returns the mean distance of the passed points between their position in
/// the first and the second transformation.
/// This method is used by the getBodyDistance method.
PhysicsScene.prototype.meanPointDistance = function(points, xf1, xf2) {
  var dist = 0;
  for (var i=0; i<points.length; i++) {
    var p = points[i];
    var d = p.Transformed(xf1);
    d.Subtract(p.Transformed(xf2));
    dist += d.Length();
  }
  return dist / points.length;
}

/// Returns the number of dynamic objects that are awake.
PhysicsScene.prototype.countAwake = function() {
	var count = 0;
	this.forEachDynamicBody(function(b) { if (b.IsAwake()) count++ });
	return count;
}

var ListenerPattern = function() {
	this.listeners = [];
}
ListenerPattern.prototype.addListener = function(l) { this.listeners.push(l) }
ListenerPattern.prototype.removeListener = function(l) {
	var i=this.listeners.indexOf(l);
	if (i>=0) Array.remove(this.listeners, l);
}
ListenerPattern.prototype.removeAll = function() { this.listeners = [] }
ListenerPattern.prototype.emit = function() {
	for (var i = 0; i < this.listeners.length; i++) {
		this.listeners[i].apply(this.listeners[i], arguments);
	}
}