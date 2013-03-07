var impulse_table = {'small': 0.5, 'medium': 1.0, 'large': 1.5};
var b2Shape = Box2D.Collision.Shapes.b2Shape;

/// Impulse is a b2Vec, where its direction is the direction of the impulse and
/// its length is the strength of the impulse in kg*(m/s) which is mass*velocity.
/// Point is a b2Vec and is the point to which the impulse is applied in body coords.
function applyImpulse(body, impulse, point) {
  var p = point.Copy(); p.Add(body.m_sweep.c)
  body.ApplyImpulse(impulse, p);
}

/// Applies an impulse to the center of an object.
/// Strength can either be a float (it is multiplied with the directing to get the
/// input) or a string ('small', 'medium' or 'large' - the strength is set to
/// 0.5, 1 or 1.5 of the body's mass).
/// Dir can either be a b2Vec2 or a string ('left', 'right', 'up' or 'down').
function applyCentralImpulse(body, dir, strength) {
  if (typeof(strength) == 'string') strength = impulse_table[strength] * body.m_mass;
  if (typeof(dir) == 'string') dir = dir_table[dir];
  var impulse = dir.Copy();
  impulse.Multiply(strength);
  applyImpulse(body, impulse, new b2Vec2(0,0));
}

/// Returns whether the object is 'stable', 'unstable' or 'moving'.
/// An object is 'moving', if its speed is above 0.1 now or after running the simulation
/// for 0.1 seconds without applying any external force. An object is considered
/// 'stable' if, after pushing it with an impulse as big as its mass, after
/// 0.3 seconds of simulation, its position changed less than 0.23, its rotation
/// changed less than 30 degrees and its speed is less than 0.5. If the body is
/// a circle, the rotation is not considered.
function checkStability(body) {
  var check = function(dir) {
    body.m_world.PushState();
    var rot0 = body.GetAngle();
    applyCentralImpulse(body, dir, body.m_mass);
    stepWorld(body.m_world, 0.3);
    //console.log('pushed',dir,'speed:',body.m_linearVelocity.Length());
    if (body.m_linearVelocity.Length()<0.5) {
      var dx = getBodyDistance(body, body.bodystates[body.bodystates.length-1].m_xf);
      //console.log('pushed',dir,'dist:',dx);
      if (dx < 0.23) {
        var drot = norm_rotation(body.GetAngle() - rot0);
        //console.log('pushed',dir,'rotation:',drot);
        if ((Math.abs(drot) < 30*Math.PI/180) || body.IsCircle()) {
          body.m_world.PopState();
          return true;
        }
      }
    }
    body.m_world.PopState();
    return false;
  }
  // check for 'moving'
  // moving now?
  if (body.m_linearVelocity.Length()>0.1) return 'moving';
  // moving after 0.1 seconds?
  body.m_world.PushState();
  stepWorld(body.m_world, 0.1);
  //console.log('velocity:', body.m_linearVelocity.Length());
  if (body.m_linearVelocity.Length()>0.1) {
    body.m_world.PopState();
    return 'moving';
  }
  body.m_world.PopState();

  // check for 'stable'
  return (check('left') && check('right')) ? 'stable' : 'unstable';
}

/// By adding multiplies of 2*PI, the argument is transformed into the interval
/// [-PI,PI].
function norm_rotation(rot) {
  rot = rot % (Math.PI*2);
  if (rot < -Math.PI) rot += Math.PI*2;
  else if (rot > Math.PI) rot -= Math.PI*2;
  return rot;
}

var dir_table = {'left': new b2Vec2(-1,0), 'right': new b2Vec2(1,0),
                 'up': new b2Vec2(0,1), 'down': new b2Vec2(0,-1)};

function stepWorld(world, time) {
  var dt = 1/60;
  var t = dt;
  while (t<time) {
    world.Step(dt, 10, 10);
    t += dt;
  }
  world.Step(dt + t - time, 10, 10);
}

function meanPointDistance(points, xf1, xf2) {
  var dist = 0;
  for (var i=0; i<points.length; i++) {
    var p = points[i];
    var d = p.Transformed(xf1);
    d.Subtract(p.Transformed(xf2));
    dist += d.Length();
  }
  return dist / points.length;
}

function getBodyDistance(body, xf) {
  if (body.m_fixtureList.m_shape.GetType() == b2Shape.e_circleShape) {
    var d = body.m_xf.position.Copy();
    d.Subtract(xf.position);
    return d.Length();
  } else {
    return meanPointDistance(body.m_fixtureList.m_shape.GetVertices(), body.m_xf, xf);
  }
}

/// For now, we just compare the position and ignore the rotation. The body is at
/// the same position, if the distance between the two positions is less than
/// 'tolerance' * sqrt(area). The default value for 'tolerance' is 10% or 0.1.
function samePosition(body, xf, tolerance) {
  if (typeof(tolerance) != 'number') var tolerance = 0.1;
  var d = getBodyDistance(body, xf);
  var thresh = tolerance * Math.sqrt(body.GetArea());
  console.log(d, thresh);
  return (d < thresh);
}

/// Returns true if the speed of the body is larger than 5/100 of its bounding
/// box diameter.
function doesMove(body) {
  var thresh = 0.05 * Math.sqrt(body.GetArea());
  return (body.m_linearVelocity.Length() > thresh);
}