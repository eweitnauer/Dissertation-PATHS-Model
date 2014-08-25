/// Written by Erik Weitnauer, 2013.
/**
PhyscisOracle:
This class provides all functionality of the "physics black box" to the PBP Interpreter. It has the following methods:

- observeCollisions(): gives back an array of collision events {a, b, dv, t} where a is the body moving faster towards the other (the active one)
- getTouchGroups(): gives back an array of arrays of dyn. bodies that directly or indirectly touch each other
- getTouchedBodies(body): gives back an array of bodies directly touched by the passed body, potentially including the ground.
*/
/// Pass a b2World.
var PhysicsOracle = function(physics_scene) {
	this.pscene = physics_scene;
  this.pscene.onWorldChange.addListener(this.onWorldChange.bind(this));
	this.contact_listener = new PhysicsOracle.ContactListener(this);
  this.curr_state = "0"; // null if unknown
  this.states = {'0'    : {time: 0, pstate: null},
                 'start': {time: 0.08, pstate: null},
                 'end'  : {time: 'end', pstate: null}};
}

/// The state can be one of the ones defined in this.states. Each state gets saved the first time
/// it is reached so the second time, no simulation is neccessary.
PhysicsOracle.prototype.gotoState = function(state) {
  if (this.curr_state === state) return;
  if (!(state in this.states)) {
    this.curr_state = null;
    throw 'unknown state "' + state + '"';
  }
  var s = this.states[state];
  if (s.pstate) this.loadPhysicsState(s.pstate);
  else {
    if (this.states[state].time == 'end') this.pscene.simulateUntilSleep(12);
    else this.pscene.seek(this.states[state].time);
    this.savePhysicsState(state);
  }
  this.curr_state = state;
}

PhysicsOracle.prototype.useCurrAsInitialState = function() {
  this.pscene.world.curr_time = 0;
  this.pscene.world.PushState();
  this.curr_state = '0';
  d3.values(this.states).forEach(function(state) { state.pstate = null });
  this.pscene.reset();
}

/// Get the current state of the physics simulation and save in this.states.
PhysicsOracle.prototype.savePhysicsState = function(state) {
  this.states[state].pstate = this.pscene.getState();
}

/// Revert to a previously recorded state of the physics world.
PhysicsOracle.prototype.loadPhysicsState = function(pstate) {
  this.pscene.setState(pstate);
}

/// It saves the world state, calls the start_callback, simulates the world for the passed
/// time, calls the end_callback and restores the previous world state. Returns the value
/// returned by end_callback. Since pscene.analyzeFuture temporarily deactivates the worldChanged
/// callbacks, the PhysicsOracle will still be in the same state after simulation, as it was before.
/// The start_callback can be used to, e.g., apply an impulse. It can also be null.
/// If untilSleep is passed as true, the simulation might stop before `time`, if all bodies in
/// the scene are at rest.
PhysicsOracle.prototype.analyzeFuture = function(time, start_callback, end_callback, untilSleep) {
  return this.pscene.analyzeFuture(time, start_callback, end_callback, untilSleep);
}

/// Called when the world changed, calls synchShapes and sets curr_state to null.
PhysicsOracle.prototype.onWorldChange = function() {
  this.curr_state = null;
  this.synchShapes();
}

/// Calls synch_to_phys for every body's master shape object. This updates the x, y and rot attributes of
/// the shapes.
PhysicsOracle.prototype.synchShapes = function() {
  this.pscene.forEachBody(function(b) { b.master_obj.synch_to_phys() });
}

PhysicsOracle.prototype.isStatic = function(body) {
  return body.m_type == b2Body.b2_staticBody;
}

/// Applies an impulse to the center of the passed object.
/// Strength can either be a float (it is multiplied with the direction to get the
/// input) or a string ('small', 'medium' or 'large' - the strength is set to
/// 0.5, 1 or 1.5 of the body's mass). Dir can either be a b2Vec2 or a string
/// ('left', 'right', 'up' or 'down').
PhysicsOracle.prototype.applyCentralImpulse = function(body, dir, strength) {
  /// Impulse is a b2Vec, where its direction is the direction of the impulse and
  /// its length is the strength of the impulse in kg*(m/s) which is mass*velocity.
  /// Point is a b2Vec and is the point to which the impulse is applied in body coords.
  var applyImpulse = function(body, impulse, point) {
    var p = point.Copy(); p.Add(body.m_sweep.c)
    body.ApplyImpulse(impulse, p);
  }
  var strength_map = {'small': 0.5, 'medium': 1.0, 'large': 1.5};
  var dir_map      = {'left': new b2Vec2(-1,0), 'right': new b2Vec2(1,0),
                        'up': new b2Vec2(0,1),   'down': new b2Vec2(0,-1)};
  if (typeof(strength) == 'string') strength = strength_map[strength] * body.m_mass;
  if (typeof(dir) == 'string') dir = dir_map[dir];
  var impulse = dir.Copy();
  impulse.Multiply(strength);
  applyImpulse(body, impulse, new b2Vec2(0,0));
}

/// Returns all objects grouped by touch. E.g "A  BC" will be returned as [[A], [B,C]]. Only
/// regards dynamic bodies.
PhysicsOracle.prototype.getTouchGroups = function() {
  var touches = [], bodies = [];
  this.pscene.forEachDynamicBody(function(b) { bodies.push(b) });
  // link all dynamic bodies which touch
  for (var c = this.GetContactList(); c; c=c.m_next) {
    if (!c.IsTouching()) continue;
    var a = c.m_fixtureA.m_body, b = c.m_fixtureB.m_body;
    if (a.GetType() !== b2Body.b2_dynamicBody ||
        b.GetType() !== b2Body.b2_dynamicBody) continue;
    touches.push([a, b]);
  }
  return this.groupLinkedNodes(bodies, touches);
}

/// Returns a list with all touched bodies, possibly including the ground or the frame.
/// Each touched body is only in the list once, even if touched at several places.
PhysicsOracle.prototype.getTouchedBodies = function(body) {
  var res = [];
  var gb = body.m_world.m_groundBody;
  for (var c = body.m_world.GetContactList(); c; c=c.m_next) {
    if (!c.IsTouching()) continue;
    var a = c.m_fixtureA.m_body, b = c.m_fixtureB.m_body;
    if (a != body && b != body) continue;
    if (a == gb || b == gb) continue;
    a = (a == body ? b : a);
    if (res.indexOf(a) == -1) res.push(a);
  }
  return res;
}

/// Returns a list of {body: touched_body, pts: [world_pos]} objects. If an object is
/// touched at several places, it might be in the list several times.
PhysicsOracle.prototype.getTouchedBodiesWithPos = function(body) {
  var res = [];
  var gb = body.m_world.m_groundBody;
  var wm = new Box2D.Collision.b2WorldManifold();
  for (var c = body.m_world.GetContactList(); c; c=c.m_next) {
    if (!c.IsTouching()) continue;
    var a = c.m_fixtureA.m_body, b = c.m_fixtureB.m_body;
    if (a != body && b != body) continue;
    if (a == gb || b == gb) continue;
    c.GetWorldManifold(wm);
    var pts = wm.m_points.slice(0, c.m_manifold.m_pointCount);
    res.push({body: (a == body ? b : a), pts: pts});
  }
  return res;
}

/// Returns all objects grouped by vicinity. E.g "A    B C" will be returned as [[A], [B,C]]
/// if dist(A, B) > max_dist and dist(B,C) is <= max_dist. All static objects are ignored.
/// If no bodies are passed, all bodies in the scene are used.
PhysicsOracle.prototype.getSpatialGroups = function(max_dist, bodies) {
  var links = [];
  if (!bodies) {
    bodies = [];
    this.pscene.forEachDynamicBody(function(b) { bodies.push(b) });
  }
  for (var i=0; i<bodies.length-1; i++) for (var j=i+1; j<bodies.length; j++) {
    if (bodies[i].distance(bodies[j]) <= max_dist) links.push([bodies[i], bodies[j]]);
  };
  return this.groupLinkedNodes(bodies, links);
}

/// Returns the nodes in groups where each group contains all nodes between which there is
/// a path of links.
PhysicsOracle.prototype.groupLinkedNodes = function(nodes, links) {
  var res=[];
  for (var i=0; i<nodes.length; i++) {
    res.push([nodes[i]]);
    nodes[i]._ew_group_ = i;
  }
  for (var i=0; i<links.length; i++) {
    var n1 = links[i][0], n2 = links[i][1];
    var g1 = n1._ew_group_, g2 = n2._ew_group_;
    if (g1 == g2) continue;
    // put all objects from group g2 into g1
    for (var j=0; j<res[g2].length; j++) {
      var n3 = res[g2][j];
      n3._ew_group_ = g1;
      res[g1].push(n3);
    }
    res[g2] = [];
  }
  for (var i=0; i<nodes.length; i++) delete nodes[i]._ew_group_;
  return res.filter(function(x){return x.length});
}

/// Gives back an array of collision events {a, b, dv, t} where a is the 'hitter' and b the
/// 'hit' body.
PhysicsOracle.prototype.observeCollisions = function() {
	var old_cl = this.pscene.world.m_contactManager.m_contactListener;
	this.pscene.world.SetContactListener(this.contact_listener);
	this.collisions = [];
  var thiz = this;

  this.analyzeFuture(12, null, function() {
    thiz.pscene.world.SetContactListener(old_cl);
    thiz.collisions = PhysicsOracle.mergeCollisions(thiz.collisions, 0);
    // save current state as end state, if we didn't cache it yet
    if (!thiz.states.end.pstate) thiz.savePhysicsState('end');
  }, true);

  return this.collisions;
}

/// Merges collision of any body pair that are temporally closer than `max_dt` default: 0.25 s.
/// It also removes any collision that happened before `min_t` default: 0.1 s (this is useful
/// since often objects that are supposed to lie on the ground are hitting the ground in the
/// first 0.1 seconds).
PhysicsOracle.mergeCollisions = function(collisions, min_t, max_dt) {
  var res = [];
  if (typeof(max_dt) == 'undefined') max_dt = 0.25;
  if (typeof(min_t)  == 'undefined') min_t  = 0.1;
  for (var i=0; i<collisions.length; i++) {
    var c = collisions[i];
    if (c.t < min_t) continue;
    var r = res[res.length-1];
    if (r && ((r.a == c.a && r.b == c.b) || (r.a == c.b && r.b == c.a))
          && (Math.abs(r.t - c.t) <= max_dt)) {
      r.dv = Math.max(r.dv, c.dv);
    } else {
      res.push(c);
    }
  }
  return res;
}

PhysicsOracle.ContactListener = function(parent) {
	var wm = new Box2D.Collision.b2WorldManifold();
	this.BeginContact = function (contact) {}
  this.EndContact = function (contact) {}
  /// for a new or changed contact, save the delta velocities in normal direction for all
  /// contact points
  this.PreSolve = function (contact, oldManifold) {
  	// don't do anything if we already know this contact and it had the same
  	// number of points in its manifold last time already
  	if (!contact.IsTouching()) {
    	contact.pointCount = 0;
    	contact.process = false;
    	return;
  	}
  	if (contact.pointCount && contact.pointCount == contact.m_manifold.m_pointCount) {
    	contact.process = false;
    	return;
 	 	}
  	contact.pointCount = contact.m_manifold.m_pointCount;
  	contact.process = true;
  	var bodya = contact.m_fixtureA.m_body, bodyb = contact.m_fixtureB.m_body;
  	contact.GetWorldManifold(wm);
  	var max_vel_a = 0, max_vel_b = 0;
  	var norm = wm.m_normal;

  	// If a rectangle lies on the ground, you pick up one corner, tilt it and let it fall
  	// back to the ground then you'll have two contact points, but only in one of them
  	// there will be a relative speed (on the side that was lifted). We are interested the
  	// highest objects speeds in all contact points.
  	// CAUTION: wm.m_points might contain more points than are actually set,
  	//          we can only use the first contact.m_manifold.m_pointCount points!
  	for (var i=0; i<contact.m_manifold.m_pointCount; i++) {
    	var vel_a = bodya.GetLinearVelocityFromWorldPoint(wm.m_points[i]);
    	var vel_b = bodyb.GetLinearVelocityFromWorldPoint(wm.m_points[i]);
    	vel_a = vel_a.x*norm.x + vel_a.y*norm.y;
    	vel_b = vel_b.x*norm.x + vel_b.y*norm.y;
    	if (Math.abs(vel_a) > Math.abs(max_vel_a)) max_vel_a = vel_a;
    	if (Math.abs(vel_b) > Math.abs(max_vel_b)) max_vel_b = vel_b;
  	}
  	contact.vel_a = max_vel_a;
  	contact.vel_b = max_vel_b;
	}
	/// if the delta speed is high enough,
	this.PostSolve = function (contact, impulse) {
    if (!contact.process) return;
	  var dv = Math.abs(contact.vel_a-contact.vel_b);
  	if (dv > 0.5) {
    	var bodya = contact.m_fixtureA.m_body, bodyb = contact.m_fixtureB.m_body;
      var world = bodya.m_world;
    	if (Math.abs(contact.vel_a) > Math.abs(contact.vel_b)) {
      	//console.log(bodya.master_obj.id, 'hits', bodyb.master_obj.id, 'with', dv, 'at', world.curr_time);
      	parent.collisions.push({a: bodya, b: bodyb, dv:dv, t: world.curr_time});
    	} else {
      	//console.log(bodyb.master_obj.id, 'hits', bodya.master_obj.id, 'with', dv, 'at', world.curr_time);
      	parent.collisions.push({a:bodyb, b:bodya, dv:dv, t: world.curr_time});
    	}
    }
  }
}
