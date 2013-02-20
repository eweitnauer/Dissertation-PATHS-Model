var b2Vec2 = Box2D.Common.Math.b2Vec2
   ,b2AABB = Box2D.Collision.b2AABB
   ,b2BodyDef = Box2D.Dynamics.b2BodyDef
   ,b2Body = Box2D.Dynamics.b2Body
   ,b2FixtureDef = Box2D.Dynamics.b2FixtureDef
   ,b2Fixture = Box2D.Dynamics.b2Fixture
   ,b2World = Box2D.Dynamics.b2World
   ,b2MassData = Box2D.Collision.Shapes.b2MassData
   ,b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
   ,b2CircleShape = Box2D.Collision.Shapes.b2CircleShape
   ,b2DebugDraw = Box2D.Dynamics.b2DebugDraw
   ,b2MouseJointDef =  Box2D.Dynamics.Joints.b2MouseJointDef;

var s = 2; // scaling: 1 unit will be s*1 meters, the displayed area is sxs

function onload() {
  can = document.getElementById("canvas");
  world = createWorld();
  sim = new Simulator(world, can, 400/s);
  sim.playing = true;
}

function createWorld() {
  var world = new b2World(new b2Vec2(0.0, 9.81), true);
  world.SetWarmStarting(true);

  var fixDef = new b2FixtureDef();
  fixDef.density = 1.0;
  fixDef.friction = 0.5;
  fixDef.restitution = 0.2;
  var bodyDef = new b2BodyDef();

  // create ground
  bodyDef.type = b2Body.b2_staticBody;
  fixDef.shape = new b2PolygonShape();
  fixDef.shape.SetAsBox(s*0.5, s*0.1);
  bodyDef.position.Set(s*0.5, 1.08*s);
  world.CreateBody(bodyDef).CreateFixture(fixDef);
  bodyDef.position.Set(s*0.5, -0.08*s);
  world.CreateBody(bodyDef).CreateFixture(fixDef);
  fixDef.shape.SetAsBox(0.1*s, s*0.5);
  bodyDef.position.Set(-0.08*s, 0.5*s);
  world.CreateBody(bodyDef).CreateFixture(fixDef);
  bodyDef.position.Set(1.08*s, 0.5*s);
  world.CreateBody(bodyDef).CreateFixture(fixDef);


  //create some objects
  bodyDef.type = b2Body.b2_dynamicBody;
  for(var i = 0; i < 10; ++i) {
    if(Math.random() > 0.5) {
       fixDef.shape = new b2PolygonShape;
       fixDef.shape.SetAsBox(
             0.1*s*(Math.random() + 0.1) //half width
          ,  0.1*s*(Math.random() + 0.1) //half height
       );
    } else {
       fixDef.shape = new b2CircleShape(
          0.1*s*(Math.random() + 0.1) //radius
       );
    }
    bodyDef.position.x = s * (Math.random() * 0.9 + 0.05);
    bodyDef.position.y = s * (Math.random() * 0.9 + 0.05);
    world.CreateBody(bodyDef).CreateFixture(fixDef);
  }

  return world;
}
