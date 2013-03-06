var scale = 3, sim, scene;

function loadScene() {
  //scene = SVGSceneParser.parseFile("2-1.svg");
  scene = SVGSceneParser.parseFile("../../libs/pbp-svgs/svgs/pbp33/3-1.svg");
  //scene = SVGSceneParser.parseFile("../../libs/pbp-svgs/svgs/pbp19/3-4.svg");
  // well now we could display the scenes, no?
  var display1 = document.getElementById('svg');
  var child; while (child = display1.childNodes[0]) { display1.removeChild(child); }
  scene.renderInSvg(document, display1, 0, 0, scale);

  // okay, next we will be so bold as to put the scene into a b2World
   world = new Box2D.Dynamics.b2World(new Box2D.Common.Math.b2Vec2(0, 10), true);
   var adapter = new Box2DAdapter();
   scene.pixels_per_unit = 50;
   scene.friction = 0.3;
   scene.resitution = 0.1;
   adapter.loadScene(world, scene, true, false);

   var display2 = document.getElementById('canvas');
   if (sim) sim.release();
   sim = new Simulator(world, display2, scene.pixels_per_unit*scale);
   sim.playing = true;

   world.SetContactListener(new ContactListener());
}

var collisions = [];

function mergeCollisions(collisions, max_dt) {
  var res = [];
  if (typeof(max_dt) == 'undefined') max_dt = 0.25;
  for (var i=0; i<collisions.length; i++) {
    var c = collisions[i];
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

var ContactListener = function() {
  var wm = new Box2D.Collision.b2WorldManifold();
  this.BeginContact = function (contact) {
    contact.first_time = true;
  } //console.log('begin contact', contact) }
  this.EndContact = function (contact) {
  } //console.log('end contact', contact) }
  this.PreSolve = function (contact, oldManifold) {
    // don't do anything if we know this contact and it had the same number of points
    // in its manifold last time already
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
  this.PostSolve = function (contact, impulse) {
    if (!contact.process) return;
    var dv = Math.abs(contact.vel_a-contact.vel_b);
    if (dv > 0.5) {
      contact.first_time = false;
      var bodya = contact.m_fixtureA.m_body, bodyb = contact.m_fixtureB.m_body;
      if (Math.abs(contact.vel_a) > Math.abs(contact.vel_b)) {
        console.log(bodya.master_obj.id, 'hits', bodyb.master_obj.id, 'with', dv, 'at', sim.curr_time);
        collisions.push({a: bodya, b: bodyb, dv:dv, t:sim.curr_time});
      } else {
        console.log(bodyb.master_obj.id, 'hits', bodya.master_obj.id, 'with', dv, 'at', sim.curr_time);
        collisions.push({a:bodyb, b:bodya, dv:dv, t:sim.curr_time});
      }
      //if (Math.abs(impulse.normalImpulses[0]) > Math.abs(impulse.normalImpulses[1])) console.log(bodyb.master_obj.id, 'hits', bodya.master_obj.id, impulse.normalImpulses);
      return;
      /// Sadly, the following code does not work because there is no way to access the velecity of the objects before the collision...
      // var wm = new Box2D.Collision.b2WorldManifold();
      // contact.GetWorldManifold(wm);
      // var max_vel_a = 0, max_vel_b = 0;
      // var norm = wm.m_normal;
      // // If a rectangle lies on the ground, you pick up one corner, tilt it and let it fall
      // // back to the ground then you'll have two contact points, but only in one of them
      // // there will be a relative speed (on the side that was lifted). We are interested the
      // // highest objects speeds in all contact points.
      // for (var i=0; i<wm.m_points.length; i++) {
      //   if (wm.m_points[i].x == 0 && wm.m_points[i].y == 0) {
      //     //console.log('oooops')
      //     continue;
      //   }
      //   var vel_a = bodya.GetLinearVelocityFromWorldPoint(wm.m_points[i]);
      //   var vel_b = bodyb.GetLinearVelocityFromWorldPoint(wm.m_points[i]);
      //   console.log('norm', norm, 'vel_a', vel_a, 'vel_b', vel_b);
      //   console.log(bodya.m_linearVelocity);
      //   console.log(bodyb.m_linearVelocity);
      //   vel_a = Math.abs(vel_a.x*norm.x + vel_a.y*norm.y);
      //   vel_b = Math.abs(vel_b.x*norm.x + vel_b.y*norm.y);
      //   if (vel_a > max_vel_a) max_vel_a = vel_a;
      //   if (vel_b > max_vel_b) max_vel_b = vel_b;
      // }
      // console.log('hit', bodya.master_obj.id + '-' + bodyb.master_obj.id +':', strength, max_vel_a, max_vel_b);
    }
  }
}

function init() {
  loadScene();
}