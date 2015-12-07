var SVGSceneParser = (function() {
  var PREFIX = 's2p-';
  var pub = {};

  /// Load the content of given URL.
  var ajaxGetUrl = function(url) {
    var AJAX;
    if(window.XMLHttpRequest){AJAX=new XMLHttpRequest();}
    else{AJAX=new ActiveXObject('Microsoft.XMLHTTP');}
    if(AJAX){
      AJAX.open('GET',url,false);
      AJAX.send(null);
      return AJAX.responseText;
    }
    return null;
  }
  pub.ajaxGetUrl = ajaxGetUrl;

  // Parse an XML string, return as DOM tree.
  var parseXml = function(xml) {
    if (window.DOMParser) {
      var parser = new DOMParser();
      //return parser.parseFromString(xml, 'image/svg+xml');
      return parser.parseFromString(xml, 'image/svg+xml');
    } else {
      xml = xml.replace(/<!DOCTYPE svg[^>]*>/, '');
      var xmlDoc = new ActiveXObject('Microsoft.XMLDOM');
      xmlDoc.async = 'false';
      xmlDoc.loadXML(xml);
      return xmlDoc;
    }
  }
  pub.parseXml = parseXml;

  /// Reads all styles set for a node and returns them as a hash.
  var readStyle = function(node, scaling) {
    var s = {};
    for (var i=0; i<node.style.length; ++i) {
      var key = node.style.item(i);
      s[key] = node.style.getPropertyValue(key);
    }
    return s;
  }

  /// Returns the scaling that is done by the passed svg transformation.
  var extract_scaling = function(tf) {
    return (Point.len(tf.a, tf.b) + Point.len(tf.c, tf.d)) / 2
  }

  /// Loads the shapes in the scene from the contents of an svg file (passed as url).
  var parseFile = function(file_url, pixels_per_unit) {
    var content = ajaxGetUrl(file_url);
    return parseString(content, pixels_per_unit);
  }
  pub.parseFile = parseFile;

  /// Loads the shapes in the scene from the contents of an svg file (passed as string).
  /// The default pixels_per_unit is 100.
  var parseString = function(svg_str, pixels_per_unit) {
    pixels_per_unit = pixels_per_unit || 100;
    var svg_dom = parseXml(svg_str);
    if (!svg_dom) throw 'Error parsing ' + svg_str;

    // WORKAROUND 1
    // normally we would use the svg dom tree directly, but due to this bug in Firefox
    // (https://bugzilla.mozilla.org/show_bug.cgi?id=756985),
    // we need to add it to the main dom tree if we want to use getCTM() dom function.
    var root = append_svg_to_dom(svg_dom, "hidden_svg_div");
    //var root = append_svg_to_dom(svg_str, "hidden_svg_div");
    var shapes = [];

    // the stroke-width must be multiplied with the scaling of the object to get the
    // actual stroke width
    var scale_stroke_width = function(node, scale) {
      var sw = node.style['stroke-width'];
      if (!sw) return;
      node.style['stroke-width'] = sw.replace(/^[0-9]*\.?[0-9]+/, function(x) {return Number(x)*scale;});
    }

    /// parse all rects
    var rects = root.getElementsByTagName('rect');
    for (var i=0; i<rects.length; i++) {
      var rect_node = rects[i];
      var shape = Polygon.fromSVGRect(rect_node);
      shape.svg_transform = rect_node.getCTM();
      shape.style = readStyle(rect_node);
      scale_stroke_width(shape, extract_scaling(shape.svg_transform));
      shapes.push(shape);
    }

    // the frame is the biggest rect in the scene
    var frame = find_biggest(shapes);
    frame.is_frame = true;
    shapes = shapes.filter(function(o) { return !o.is_frame});

    var path_nodes = root.getElementsByTagName('path')
      , circle_nodes = root.getElementsByTagName('circle');
    var els = Array.prototype.slice.call(path_nodes)
            .concat(Array.prototype.slice.call(circle_nodes));
    for (var i=0; i<els.length; i++) {
      var el = els[i], shape;
      if (el.tagName === 'circle') shape = Circle.fromSVGCircle(el);
      // sometimes, circles are saved as paths in inkscape
      else shape = Circle.fromSVGPath(el, false) ||
                   Polygon.fromSVGPath(el, 1, false);
      if (shape instanceof Polygon) {
        shape.merge_vertices({min_dist: 1, min_vertex_count: 2});
      }
      shape.svg_transform = el.getCTM();
      shape.style = readStyle(el);
      scale_stroke_width(shape, extract_scaling(shape.svg_transform));
      shapes.push(shape);
    }

    // var circles = root.getElementsByTagName('circle');
    // for (var i=0; i<circles.length; i++) {
    //   var circle_node = circles[i];
    //   var shape = Circle.fromSVGPath(path_node, false)

    // set `movable` property for all object that have no black stroke color
    shapes.forEach(function(s) {
      var color = s.style.stroke;
      s.movable = !(color == "#000000" || color == "#000" || color == "black" || color == "rgb(0, 0, 0)");
    });

    apply_transformations([frame], 0, 0, 1, root);
    var s  = 100/Math.abs(frame.pts[0].x-frame.pts[1].x)
       ,dx = -Math.min(frame.pts[0].x, frame.pts[1].x)
       ,dy = -Math.min(frame.pts[0].y, frame.pts[2].y)
    apply_transformations(shapes, dx, dy, s, root);
    apply_transformations([frame], dx, dy, s, root);

    return new SVGScene(shapes, frame, pixels_per_unit);
  }
  pub.parseString = parseString;

  /// Applies the svg transformation to each object.
  var apply_transformations = function(shapes, dx, dy, s, svg) {
    var svg_pt = svg.createSVGPoint(0,0);
    shapes.forEach(function(shape) {
      var transform = function(p) {
        svg_pt.x = p.x; svg_pt.y = p.y;
        if (shape.svg_transform) svg_pt = svg_pt.matrixTransform(shape.svg_transform);
        p.x = s*svg_pt.x+dx; p.y = s*svg_pt.y+dy;
      }
      if (shape instanceof Circle) {
        var c = shape.centroid(); transform(c);
        shape.x = c.x; shape.y = c.y;
        if (shape.svg_transform) shape.r *= Math.abs(shape.svg_transform.a);
      }
      else if (shape instanceof Polygon) shape.pts.forEach(transform);
      else throw "Unkown object type";
      delete shape.svg_transform;
    });
  }

  var find_biggest = function(objs) {
    var max_area = 0, biggest = null;
    for (var i=0; i<objs.length; i++) {
      var scaling = objs[i].svg_transform.a;
      var area = Math.abs(objs[i].area()*scaling*scaling);
      if (area > max_area) { max_area = area; biggest = objs[i]}
    };
    return biggest;
  }

  /// Will append the passed dom structure to the main document inside the div
  /// with the passed id. If the div does not exist it is created and styled
  /// so its invisible.
  var append_svg_to_dom = function(svg_dom, parent_id) {
    var parent = document.getElementById(parent_id);
    if (!parent) {
      parent = document.body.appendChild(document.createElement('div'));
      parent.setAttribute("id", parent_id);
      // it is important for Chromium 18 to set the style this way and not by using parent.style.xxx
      // because otherwise evaluating an XPathExpression on the main dom tree will cause an
      // INVALID_STATE_ERR: DOM Exception 11
      parent.setAttribute("style", "position:absolute;width:1px;height:1px;overflow:hidden;left:-10px;");
    } else {
      var child;
      while (child = parent.childNodes[0]) { parent.removeChild(child); }
    }
    return parent.appendChild(svg_dom.rootElement);
    //parent.innerHTML = svg_dom;
    //return parent.getElementsByTagName('svg')[0];
  }

  return pub;
})();


SVGScene = function(shapes, frame, pixels_per_unit) {
  this.shapes = shapes || []; // may contain polygons or circles
  this.frame = frame;
  this.shapes.push(frame);
  this.setIds();
  this.width = 100;
  this.height = 100;
  this.friction = 0.3;
  this.restitution = 0.1;
  this.pixels_per_unit = pixels_per_unit;
  this.moveToOrigin();
}

SVGScene.prototype.adjustStrokeWidth = function(width) {
  var reg_float = /^[0-9]*\.?[0-9]+/;
  for (var i=0; i<this.shapes.length; i++) {
    var shape = this.shapes[i];
    var stroke_width = 1;
    if (reg_float.test(shape.style['stroke-width'])) {
      stroke_width = Number(reg_float.exec(shape.style['stroke-width'])[0]);
    }
    var bb = shape.bounding_box();
    var scale_x = (bb.width + stroke_width) / (bb.width + width);
    var scale_y = (bb.height + stroke_width) / (bb.height + width);
    if (shape instanceof Polygon) {
      if (shape.movable) {
        //console.log('scale', scale_x, scale_y);
        shape.pts.forEach(function(p) { p.x *= scale_x; p.y *= scale_y });
        shape.style['stroke-width'] = width;
      } else if (shape.id == "_") {
        // if its the ground, move it up a bit
        shape.pts.forEach(function(p) { p.y += (width-stroke_width)/2 });
        shape.style['stroke-width'] = width;
      }
    } else if (shape instanceof Circle) {
      shape.style['stroke-width'] = width;
      shape.r = shape.r * scale_x;
    }
  }
}

SVGScene.prototype.setIds = function() {
  for (var i=0; i<this.shapes.length; i++) {
    if (this.shapes[i].movable) this.shapes[i].id = i;
    else if (this.shapes[i] == this.frame) this.shapes[i].id = '|'
    else this.shapes[i].id = '_';
  }
}

/// Centers all polygon shapes onto the origin and saves their original centers in x, y.
/// Also sets rot to 0.
SVGScene.prototype.moveToOrigin = function() {
  for (var i=0; i<this.shapes.length; i++) {
    var shape = this.shapes[i];
    if (!(shape instanceof Polygon)) continue;
    var pos = shape.centroid();
    shape.pts.forEach(function(p) { p.Sub(pos) });
    shape.x = pos.x;
    shape.y = pos.y;
    shape.rot = 0;
  }
}

SVGScene.prototype.renderInSvg = function(doc, parent, x, y, scale, show_numbers) {
  var g = doc.createElementNS('http://www.w3.org/2000/svg','g');
  g.setAttribute('transform', 'translate('+(x)+','+(y)+') scale('+scale+')');
  parent.appendChild(g);
  var rect = doc.createElementNS('http://www.w3.org/2000/svg','rect');
  // rect.setAttribute('x',0);
  // rect.setAttribute('y',0);
  // rect.setAttribute('width', this.height);
  // rect.setAttribute('height', this.width);
  // rect.setAttribute('style','fill:none; stroke:black; stroke-width:1px');
  // g.appendChild(rect);
  for (var i = 0; i < this.shapes.length; i++) {
    var shape = this.shapes[i];
    var svg_obj = shape.renderInSvg(document, g);
    for (var s in shape.style) svg_obj.style.setProperty(s, shape.style[s]);
    if (show_numbers && this.shapes[i].movable) {
      d3.select(parent).append('text').style('fill', 'black')
        .attr('x', shape.x*scale).attr('y', shape.y*scale)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central').text(i);
    }
  };
}
var
  b2BodyDef = Box2D.Dynamics.b2BodyDef
 ,b2Body = Box2D.Dynamics.b2Body
 ,b2Vec2 = Box2D.Common.Math.b2Vec2
 ,b2Shape = Box2D.Collision.Shapes.b2Shape
 ,b2CircleShape = Box2D.Collision.Shapes.b2CircleShape
 ,b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
 ,b2FixtureDef = Box2D.Dynamics.b2FixtureDef
 ,b2AABB = Box2D.Collision.b2AABB;

Box2DAdapter = function() {
  var self = this;
  this.rel_curve_error_margin = 0.08;  // unit: fraction of object diameter
  this.linear_damping = 0.35;   // Set for each body. Box2D uses the formula
  this.angular_damping = 0.35;  // angularVelocity *= b2Math.Clamp(1.0 - dt * angularDamping, 0.0, 1.0)
                                // A value of 0.35 will therefore lead to halving of the speed every
                                // two seconds in case of an update rate of 60 Hz.
  this.cd_settings = {
    max_vertices: 32
  , preprocess: true
  , pre_order_vertices: true
  , pre_merge_vertices_min_dist: 0.01 // in units
  , pre_remove_vertices_max_error: 0 // in units
  , postprocess: false
  , post_move_vertices_inside_dist: 0.02
  , debug_text: false
  };
}

/** Iterates through the passed scene's shapes and creates b2Bodys from them. Polygon shapes
    must be centered at the origin and have x, y properties to denote their position. Each
    shape must have the movable property set to true, if it is dynamic object. The
    b2Bodys are added to the passed b2World and also written to the 'phys_obj' attribute of
    their respective shape. To the b2Bodys, an attribute 'master_obj' is set to the shape for
    which it the b2Body was created. The scale that was used to create the objects is written
    to them as phys_scale attribute. A method synch_to_phys to synch the x, y and rot attribute
    with their b2Body is added.
    Parameters:
      world                  b2World
      scene                  an SVGScene object with an Array of Polygons and Circles */
Box2DAdapter.prototype.loadScene = function(world, scene) {
  // get friction, restitution and scale from the properties read from the SVG
  var friction = scene.friction;
  var restitution = scene.restitution;
  var scale = 1/scene.pixels_per_unit;

  var self = this;
  var first = true;
  // // add the frame
  // var frame = new Polygon([[0,0],[100*scale, 0],[100*scale, 100*scale],[0, 100*scale]]);
  // frame.closed = true;
  // self.createBody(world, frame, false, 0, 0, 0, 1, friction, restitution);

  // now add all other shapes
  scene.shapes.forEach(function(shape) {
    var stroke_width = 1;
    var reg_float = /^[0-9]*\.?[0-9]+/;
    if (reg_float.test(shape.style['stroke-width'])) {
      stroke_width = Number(reg_float.exec(shape.style['stroke-width'])[0]);
    }
    var target_width = Box2D.Common.b2Settings.b2_linearSlop;
    var _shape = shape.copy();
    // We now scale the shape according to the scenes' pixel per unit scale factor
    // It is important that objects that are stacked onto each other are also stacked exacty only each
    // other in the physics simulation. Box2D has a threshold b2_linearSlop used for collision and
    // constraint resolution. The border width of the shapes should be equal to this value. We will grow /
    // shrink the movable shapes and their borders so this is fulfilled.
    var bb = shape.bounding_box();
    var scale_x = (bb.width + stroke_width) / (bb.width + target_width);
    var scale_y = (bb.height + stroke_width) / (bb.height + target_width);
    if (_shape instanceof Polygon) {
      _shape.pts.forEach(function(p) { p.Scale(scale) });
      if (shape.movable) {
        //console.log('scale', scale_x, scale_y);
        _shape.pts.forEach(function(p) { p.x *= scale_x; p.y *= scale_y });
      } else if (shape.id == "_") {
         // if its the ground, move it up a bit
         _shape.pts.forEach(function(p) { p.y += (target_width-stroke_width)*scale/4 });
      }
    } else if (_shape instanceof Circle) {
      // since the b2Circle_shape as no additional collision radius as the polygon,
      // we will grow the circle to make it the same size as its SVG source,
      // which means we need to include half of its stroke-width
      _shape.r = (_shape.r+stroke_width/2) * scale;
    } else throw("Unknown object type.");
    shape.phys_scale = scale;
    /// Method that sets x, y and rot attributes of the scene object according to
    /// the state of its b2Body.
    shape.synch_to_phys = function() {
      this.x = this.phys_obj.GetPosition().x / this.phys_scale;
      this.y = this.phys_obj.GetPosition().y / this.phys_scale;
      this.rot = this.phys_obj.GetAngle();
    }
    shape.phys_obj = self.createBody(world, _shape, shape.movable, shape.x*scale, shape.y*scale,
                                     0.0, 1.0, friction, restitution);
    shape.phys_obj.master_obj = shape;
    shape.rot = 0;
  });
}

/// Creates a Box2D body according to the passed geometric and dynamic
/// information. The body is added to the world and returned.
/** Params:
  *   world: b2World
  *   shape: Polygon
  *   is_dynamic: bool
  *   x, y, angle, density, friction, restitution: number
  */
Box2DAdapter.prototype.createBody = function(world, shape, is_dynamic, x, y,
    angle, density, friction, restitution)
{
  // create the body
  var bodyDef = new b2BodyDef();
  if (is_dynamic) bodyDef.type = b2Body.b2_dynamicBody;
  bodyDef.position.Set(x,y);
  bodyDef.angle = angle;
  bodyDef.angularDamping = this.angular_damping;
  bodyDef.linearDamping = this.linear_damping;
  var body = world.CreateBody(bodyDef);

  // shape information
  var fixture_proto = {density: density, friction: friction, restitution: restitution};
  this.add_fixture(shape, body, fixture_proto, is_dynamic);

  return body;
}

/// Creates Box2D shapes from the passed polygon shape and adds it to the body.
/** If the body is dynamic, the polygon is decomposed into convex parts with no
  * more than 'max_polygon_vertices' vertices. For each of these parts a
  * b2PolygonShape is put into a fixture based on the passed fixture prototype.
  * The fixtures are then assigned to the body.
  *
  * If the body is not dynamic, either a single b2LoopShape (in case the polygon
  * is closed) or several b2EdgeShapes (one for every edge in case the polygon
  * is not closed) are used to create the fixtures. This is not possible in the
  * dynamic case, since b2LoopShapes and b2EdgeShapes are not allowed to be
  * dynamic in Box2D.
  * Params:
  *   shape: Polygon or Circle
  *   body: b2Body (to which the shape is added as fixture)
  *   fixture_proto: object (all properties are copied into the new fixture)
  *   is_dynamic: bool
  */
Box2DAdapter.prototype.add_fixture = function(shape, body, fixture_proto, is_dynamic) {
  if (shape instanceof Circle) {
    // shape is a circle
    var b2shape = new b2CircleShape(shape.r);
    var to_add = new b2FixtureDef();
    obj_extend(to_add, fixture_proto);
    to_add.shape = b2shape;
    body.CreateFixture(to_add);
  } else if (shape instanceof Polygon) {
    var poly = shape;
    // it is a polygon, we need to create different Box2D shape types for
    // dynamic and static case
    if (is_dynamic) {
      // do convex decomposition and add a b2PolygonShape for each piece
      var convex_polys = poly.convex_decomposition(this.cd_settings);
      convex_polys.forEach(function(p) {
        var b2shape = b2PolygonShape.AsVector(p.pts);
        var to_add = new b2FixtureDef();
        obj_extend(to_add, fixture_proto);
        to_add.shape = b2shape;
        body.CreateFixture(to_add);
      });
    } else {
      // simplify the poly a bit
      //poly.merge_vertices({min_dist: this.cd_settings.pre_merge_vertices_min_dist})
      // there are no working versions of b2EdgeShape or b2LoopShape in Box2D.js
      // so we use Polygons with 2 points instead
      // body is going to be static
      var N = poly.pts.length;
      if (N<2) return;
      for(var i=0; i<N; ++i) {
        if (i==N-1 && !poly.closed) break;
        var j = (i==N-1) ? 0 : i+1;
        var b2shape = b2PolygonShape.AsVector([new b2Vec2(poly.pts[i].x, poly.pts[i].y),
                                             new b2Vec2(poly.pts[j].x, poly.pts[j].y)]);
        var to_add = new b2FixtureDef();
        obj_extend(to_add, fixture_proto);
        to_add.shape = b2shape;
        body.CreateFixture(to_add);
      }
    }
  } else throw("Unkown shape type!");
}

obj_extend = function(target, src) {
  for (x in src) {
    if (src.hasOwnProperty(x)) target[x] = src[x];
  }
}

obj_extended = function(src1, src2) {
  var target = {};
  for (x in src1) {
    if (src1.hasOwnProperty(x)) target[x] = src1[x];
  }
  for (x in src2) {
    if (src2.hasOwnProperty(x)) target[x] = src2[x];
  }
  return target;
}
var b2Body = Box2D.Dynamics.b2Body
   ,b2World = Box2D.Dynamics.b2World
   ,b2Transform = Box2D.Common.Math.b2Transform
   ,b2Sweep = Box2D.Common.Math.b2Sweep
   ,b2DistanceInput = Box2D.Collision.b2DistanceInput
   ,b2DistanceOutput = Box2D.Collision.b2DistanceOutput
   ,b2DistanceProxy = Box2D.Collision.b2DistanceProxy
   ,b2SimplexCache = Box2D.Collision.b2SimplexCache
   ,b2Distance = Box2D.Collision.b2Distance
   ,b2Vec2 = Box2D.Common.Math.b2Vec2
   ,b2BodyDef = Box2D.Dynamics.b2BodyDef
   ,b2FixtureDef = Box2D.Dynamics.b2FixtureDef
   ,b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
   ,b2CircleShape = Box2D.Collision.Shapes.b2CircleShape
   ,b2AABB = Box2D.Collision.b2AABB;

b2Vec2.prototype.Transformed = function(xf) {
  return new b2Vec2(this.x*xf.R.col1.x + this.y*xf.R.col2.x + xf.position.x,
                    this.x*xf.R.col1.y + this.y*xf.R.col2.y + xf.position.y);
}

b2Body.prototype.IsCircle = function() {
  return this.m_fixtureList.m_shape instanceof b2CircleShape && this.m_fixtureList.m_next == null;
}

b2Body.prototype.GetAABB = function() {
  var aabb = null;
  for (var fix = this.m_fixtureList; fix; fix = fix.m_next) {
    if (!aabb) aabb = b2AABB.Combine(fix.m_aabb, fix.m_aabb);
    else aabb.Combine(aabb, fix.m_aabb);
  }
  return aabb;
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

/// Will set the categoryBits, maskBits and groupIndex fields passed in
/// the filter_options object. If an field is not set, the old values of the
/// filter will be kept.
/// Example: setCollisionFilter({maskBits: 0x0000}).
/// See http://www.iforce2d.net/b2dtut/collision-filtering.
b2Body.prototype.setCollisionFilter = function(filter_options) {
  var filter;
  for (var f=this.m_fixtureList; f; f = f.m_next) {
    filter = f.GetFilterData();
    if ('maskBits' in filter_options) filter.maskBits = filter_options.maskBits;
    if ('categoryBits' in filter_options) filter.categoryBits = filter_options.categoryBits;
    if ('groupIndex' in filter_options) filter.groupIndex = filter_options.groupIndex;
    f.SetFilterData(filter);
  }
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
  body.SynchronizeFixtures();
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
  this.m_contactManager.FindNewContacts();
}

/// Saves the state of the b2World and all dynamic b2Bodies into an array and returns it.
b2World.prototype.GetState = function() {
  var state = [];
  state.push({el: this, state: new b2WorldState(this)});
  for (var b = this.m_bodyList; b; b=b.m_next) {
    if (b.m_type == b2Body.b2_dynamicBody) state.push({el: b, state: new b2BodyState(b)});
  }
  return state;
}

/// Pass the result of a former GetState call to set the world to that situation.
b2World.prototype.SetState = function(state) {
  state.forEach(function (e) { e.state.Apply(e.el) });
}
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
	try { // in Box2D.js line 5218, we sometimes have proxyA being undefined
		this.world.Step(dt, 10, 10);
	} catch(err) {
		//console.log('caught error', err, 'during Box2D simulation step');
		//console.log('trying again after finding new contacts...');

		var broadPhase = this.world.m_contactManager.m_broadPhase;
		this.forEachBody(function(body) {
		  for (var f = body.m_fixtureList; f; f = f.m_next) {
		  	if (!f.m_proxy) {
		  		//console.log(body, f, 'has no m_proxy set. Creating it now...');
      		f.CreateProxy(broadPhase, body.m_xf);
      	}
     	}
  	});

		//this.world.m_contactManager.FindNewContacts();
		//var curr_time = this.world.curr_time;
		//this.reset();
		//this.simulate(curr_time+dt);
		this.step(dt);
	}
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

/// It saves the world state, calls the start_callback, simulates the world for the passed
/// time, calls the end_callback and restores the previous world state. Returns the value
/// returned by end_callback.
/// Temporarily disables the onWorldChange events.
/// The start_callback can be used to, e.g., apply an impulse. It can also be null.
/// If untilSleep is passed as true, the simulation might stop before `time`, if all bodies in
/// the scene are at rest.
PhysicsScene.prototype.analyzeFuture = function(time, start_callback, end_callback, untilSleep) {
	if (time < 0) throw "You are mistaking the past for the future."
	var old_emit_changes = this.emit_changes;
	this.emit_changes = false;
	this.pushState();
	if (start_callback) start_callback();
	if (time > 0) {
		if (untilSleep) this.simulateUntilSleep(time);
		else this.simulate(time);
	}
	var res = end_callback();
	this.popState();
	this.emit_changes = old_emit_changes;
	return res;
};

/// Calls the passed function for all bodies that have a master_object.
PhysicsScene.prototype.forEachBody = function(f) {
  for (var b = this.world.m_bodyList; b; b = b.m_next) {
  	if (b.master_obj) f(b);
  }
}

/// Calls the passed function for all dynamic bodies that have a master_object.
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

/// Wakes up all bodies.
PhysicsScene.prototype.wakeUp = function () {
	for (var b = this.world.m_bodyList; b; b = b.m_next) b.SetAwake(true);
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
}/// Written by Erik Weitnauer, 2013.
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

PhysicsOracle.prototype.release = function() {
  this.pscene.onWorldChange.removeListener(this.onWorldChange);
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

/// Returns an object {body: b2Body, dist: float} or false, if there
/// is no other body in the scene. Will only consider dynamic bodies.
PhysicsOracle.prototype.getClosestBodyWithDist = function(body) {
  var res = { body: null, dist: Infinity };
  this.pscene.forEachDynamicBody(function(other) {
    if (other === body) return;
    var dist = body.distance(other);
    if (dist < res.dist) {
      res.body = other;
      res.dist = dist;
    }
  });
  if (res.body === null) return null;
  return res;
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
/// Copyright by Erik Weitnauer, 2013.

var b2DebugDraw = Box2D.Dynamics.b2DebugDraw
  , b2MouseJointDef = Box2D.Dynamics.Joints.b2MouseJointDef;

/** Visualization of a PhysicsScene on a canvas with mouse interaction.
In the constructor, you can pass a scaling, whether the time
should be shown and whether the simulator should pause automatically when
during playing, all bodies in the scene become inactive.

Call play(), pause() and reset() to control the simulator. The drawing attribute
can be set to false to disable the drawing. If drawing is enabled, the simulator
will automatically redraw the scene if anything in it changed (e.g., it was stepped
from someone other than the Simulator).

Mouse interaction is also possible when paused, the scene will be stepped during the
interaction. If the pause was due to autopause, the simulator will switch back into
play mode when the user starts interacting.

Manually set show_pos to true in order to display the current mouse position.
*/
Simulator = function(physics_scene, canvas, scaling, show_time, auto_pause) {
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
  this.pscene = physics_scene;
  this.step_interval = 1000/30;        // frequency of stepping the scene when playing in ms
  this.interaction_interval = 1000/30; // frequency of updating the mouse interaction in ms
  this.show_time = show_time || true;  // displays current time
  this.show_pos = false;               // displays mouse pos. in world coordinates
  this.draw_scale = scaling || 1;
  this.playing = false;
  this.drawing = true;
  this.auto_pause = (auto_pause === undefined) ? true : auto_pause;
  this.init();
  this.draw();
}

/// Reset all intervals.
Simulator.prototype.release = function() {
  if (this.step_timer) clearInterval(this.step_timer);
  if (this.interaction_timer) clearInterval(this.interaction_timer);
  this.pscene.onWorldChange.removeListener(this.draw);
}

Simulator.prototype.pause = function() {
  this.was_autopaused = false;
  if (!this.playing) return;
  clearInterval(this.step_timer);
  this.step_time = null;
  this.playing = false;
}

Simulator.prototype.play = function() {
  if (this.playing) return;
  var self = this;
  self.was_autopaused = false;
  this.step_timer = setInterval(function() {
    self.pscene.step();
    if (self.auto_pause && self.pscene.countAwake() == 0) {
      self.pause();
      self.was_autopaused = true;
    }
  }, this.step_interval);
  this.playing = true;
}

Simulator.prototype.toggle = function() {
  if (this.playing) this.pause();
  else this.play();
}

Simulator.prototype.reset = function() {
  this.pscene.reset();
}

Simulator.prototype.init = function() {
  var self = this;

  // setup debug draw
  this.dbgDraw = new b2DebugDraw();
  this.dbgDraw.SetSprite(this.canvas.getContext("2d"));
  this.dbgDraw.SetDrawScale(this.draw_scale);
  this.dbgDraw.SetXFormScale(0.1);
  this.dbgDraw.SetFillAlpha(0.5);
  this.dbgDraw.SetLineThickness(1.0);
  this.dbgDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);// | b2DebugDraw.e_centerOfMassBit);
  this.pscene.world.SetDebugDraw(this.dbgDraw);
  this.pscene.onWorldChange.addListener(function() { self.draw.apply(self) });

  // setup mouse interaction
  this.mouseDown = false;
  this.mousePoint = new b2Vec2(0,0);
  this.canvas.addEventListener("mousemove", function() {
    self.handleMouseMove.apply(self, arguments);
  }, true);
  this.canvas.addEventListener("mousedown", function() {
    self.mouseDown = true;
  }, true);
  this.canvas.addEventListener("mouseup", function() {
    // if we didn't move a body, it was a normal click and we toggle the playing state
    if (!self.mouseJoint) self.toggle.apply(self);
    self.handleMouseUp.apply(self, arguments);
  }, true);
  this.canvas.addEventListener("dblclick", function() {
    self.pause();
    self.reset();
  }, true);

  // setup timers
  this.interaction_timer = setInterval(function() {
    self.updateInteraction.apply(self);
  }, this.interaction_interval);

  // get position of canvas on screen and update on scrolling to get the mouse position relative to the canvas.
  this.canvas_position = this.getElementPosition(this.canvas);
  window.addEventListener("scroll", function() { self.canvas_position = self.getElementPosition(self.canvas) });
};

Simulator.prototype.getElementPosition = function(el) {
  var x = el.offsetLeft - document.documentElement.scrollLeft,
      y = el.offsetTop - document.documentElement.scrollTop;
  while (el = el.offsetParent) {
    x += el.offsetLeft - el.scrollLeft;
    y += el.offsetTop - el.scrollTop;
  }
  return {x: x, y: y};
}


Simulator.prototype.handleMouseUp = function(evt) {
  this.mouseDown = false;
  if (this.mouseJoint) {
    this.pscene.world.DestroyJoint(this.mouseJoint);
	  this.mouseJoint = null;
	}
}

Simulator.prototype.handleMouseMove = function(evt) {
  this.mousePoint.x = (evt.clientX - this.canvas_position.x) / this.draw_scale;
  this.mousePoint.y = (evt.clientY - this.canvas_position.y) / this.draw_scale;
  if (this.mouseDown && !this.playing) {
    if (this.was_autopaused) this.play();
    else this.pscene.step();
  }
  // draw new mouse position if we would not redraw otherwise
  if (this.draw_pos && !this.mouseDown && !this.playing) this.draw();
}

/** Checks which object is at the passed position, a b2Vec2. Returns the selected body. */
Simulator.prototype.getBodyAtMouse = function() {
  var aabb = new b2AABB();
  var p = this.mousePoint;
	aabb.lowerBound.Set(p.x - 0.001, p.y - 0.001);
	aabb.upperBound.Set(p.x + 0.001, p.y + 0.001);

	var body = null;
  // first search for body
	var filter = function(fixture) {
	  var b = fixture.GetBody();
  	if (b.GetType() != b2Body.b2_staticBody && fixture.GetShape().TestPoint(b.GetTransform(), p)) {
      body = b;
      return false;
    }
    return true;
  }
  this.pscene.world.QueryAABB(filter, aabb);

  return body;
}

/// Updates mouse joint target and creates it if neccessary.
/// If mouse button is not down, it will destroy the joint.
Simulator.prototype.updateInteraction = function() {
  if (this.mouseDown && !this.mouseJoint) {
    var body = this.getBodyAtMouse();
    if (body) {
      var md = new b2MouseJointDef();
      md.bodyA = this.pscene.world.GetGroundBody();
      md.bodyB = body;
      md.target = this.mousePoint;
      md.collideConnected = true;
      md.maxForce = 300.0 * body.GetMass();
      this.mouseJoint = this.pscene.world.CreateJoint(md);
      body.SetAwake(true);
    }
  }
  if (this.mouseJoint) {
    if (this.mouseDown) {
      this.mouseJoint.SetTarget(this.mousePoint);
    } else {
      this.pscene.world.DestroyJoint(this.mouseJoint);
      this.mouseJoint = null;
    }
  }
}

Simulator.prototype.draw = function() {
  if (!this.drawing) return;
  this.pscene.world.DrawDebugData();

  if (this.show_time || this.show_pos) {
    var text = '';
    if (this.show_pos && this.mousePoint) text += ' x='+this.mousePoint.x.toFixed(2) + " y=" + this.mousePoint.y.toFixed(2);
    if (this.show_time) text += ' t=' + this.pscene.getTime().toFixed(2);
    this.ctx.fillStyle = "black";
    this.ctx.fillText(text, 5, 10);
  }
}
/// Copyright by Erik Weitnauer, 2013.

/// Visualize a scene as svg and augment it with information of a SceneNode.
var SceneVisualizer = function(scene, scene_node, svg, scaling) {
	this.scene = scene;
	this.sn = scene_node;
	this.svg = svg;
	this.svgg = d3.select(svg).append('g').attr("transform", "scale(" + scaling + ")");
	this.scaling = scaling || 1;
	this.selected = [];
	this.value_getter = null;
	this.group_getter = null;
	//this.color_scale = d3.scale.linear().domain([0, 50, 100]).range(['steelblue', 'white', 'pink']);
	this.metric_color_scale = d3.scale.pow().exponent(1.5).domain([0, 100]).range(['white', 'red']);
	this.ordinal_color_scale = d3.scale.category10();
	this.highlight_mode = 'values'; // 'values' or 'groups' or 'none'
	this.drawing = true;
}

SceneVisualizer.prototype.colorize_values = function(value_getter) {
	this.highlight_mode = 'values';
	if (value_getter) this.value_getter = value_getter;
	this.draw_scene();
}

SceneVisualizer.prototype.colorize_groups = function(group_getter) {
	this.highlight_mode = 'groups';
	this.group_getter = group_getter;
	this.draw_scene();
}

SceneVisualizer.prototype.toggleSelection = function(node) {
	var new_sel;
	if (this.selected.indexOf(node) != -1) {
		new_sel = this.selected.filter(function (n) { return n!==node });
	} else {
		new_sel = this.selected.slice();
		new_sel.push(node);
	}
	this.selectShapes(new_sel);
}

SceneVisualizer.prototype.selectShapes = function(shapes) {
	for (var i=0; i<this.selected.length; i++) this.selected[i].selected = false;
	this.selected = shapes;
	for (var i=0; i<this.selected.length; i++) this.selected[i].selected = true;
	this.svgg.selectAll('.shape')
	    .classed('selected', function (d) { return d.selected });
}

SceneVisualizer.prototype.draw_scene = function() {
	if (!this.drawing) return;
	var thiz = this;
	var add_shape = function(shape) {
		var el = d3.select(this);
		var se;
		if (shape instanceof Circle) {
			se = el.append('svg:circle')
			       .attr('cx', 0)
			       .attr('cy', 0)
			       .attr('r', shape.r);
		} else if (shape instanceof Polygon) {
			se = shape.closed ? el.append('svg:polygon') : el.append('svg:polyline');
			se.attr('points', shape.pts.map(function (pt) { return pt.x+','+pt.y }).join(' '));
		}
		se.classed('shape', true)
		  .classed('static', function (d) { return !d.movable })
		  .classed('dynamic', function (d) { return d.movable })
		  .attr('stroke-width', function (d) { return d.style['stroke-width'] })
		  .on('click', function(d) {
		  	d3.event.stopPropagation();
		  	if (d3.event.shiftKey) thiz.toggleSelection(d);
		  	else thiz.selectShapes([d]);
		  	if (thiz.value_getter) console.log(thiz.value_getter(d));
		  	console.log(d.object_node.describe());
		  });
	}
	var add_text = function(container) {
		container
		.filter(function (d) { return d.movable })
		.append('text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .text(function (d) { return d.id });
	}

	// select
	d3.select(this.svg).attr('pointer-events', 'visible').on('click', function () { thiz.selectShapes([]) });
	var gs = this.svgg.attr('pointer-events', 'visiblePainted')
		  .selectAll('.shape-container-pos')
		 	.data(this.scene.shapes, function(shape) { return shape.id });
	// enter
	var g_pos = gs.enter()
	  .append('g')
		.classed('shape-container-pos', true);
	g_pos
		.append('g')
		.classed('shape-container-rot', true)
		.each(add_shape);
	g_pos.call(add_text);

	// update
	gs.attr('transform', function (d) { return "translate(" + d.x + "," +  d.y + ")" });
	gs.select('.shape-container-rot').attr('transform', function (d) { return "rotate(" + d.rot*180/Math.PI + ")" });
	gs.select('.shape')
	  .classed('unseen', function (d) { return d.obj_node == undefined });
	if (this.highlight_mode == 'values' && this.value_getter) {
		gs.select('.shape')
		  .filter(function(d) {return d.movable})
			.style('fill', function (d) { return thiz.metric_color_scale(thiz.value_getter(d)) })
	} else if (this.highlight_mode == 'groups' && this.group_getter) {
		gs.select('.shape')
			.filter(function(d) {return d.movable})
		  .style('fill', function (d) { return thiz.ordinal_color_scale(thiz.group_getter(d)) })
	} else {
		gs.select('.shape')
			.filter(function(d) {return d.movable})
		  .style('fill', '#aaa');
	}

	// remove
	gs.exit().remove();

	// color scene background according to 'fits_solution' attribute
	var color = 'none';
	if (this.sn.fits_solution === true) color = '#efe';
	else if (this.sn.fits_solution === false) color = '#fee';
	d3.select(this.svg).style('background-color', color);//typeof(this.sn.fits_solution) === 'undefined' ? 'none'
		                                  //: this.sn.fits_solution ? 'green' : 'rgba(255,0,0,0.2)');
}

// SVGScene.prototype.renderInSvg = function(doc, parent, x, y, scale, show_numbers) {
//   var g = doc.createElementNS('http://www.w3.org/2000/svg','g');
//   g.setAttribute('transform', 'translate('+(x)+','+(y)+') scale('+scale+')');
//   parent.appendChild(g);
//   var rect = doc.createElementNS('http://www.w3.org/2000/svg','rect');
//   // rect.setAttribute('x',0);
//   // rect.setAttribute('y',0);
//   // rect.setAttribute('width', this.height);
//   // rect.setAttribute('height', this.width);
//   // rect.setAttribute('style','fill:none; stroke:black; stroke-width:1px');
//   // g.appendChild(rect);
//   for (var i = 0; i < this.shapes.length; i++) {
//     var shape = this.shapes[i];
//     var svg_obj = shape.renderInSvg(document, g);
//     for (var s in shape.style) svg_obj.style.setProperty(s, shape.style[s]);
//     if (show_numbers && this.shapes[i].movable) {
//       d3.select(parent).append('text').style('fill', 'black')
//         .attr('x', shape.x*scale).attr('y', shape.y*scale)
//         .attr('text-anchor', 'middle')
//         .attr('dominant-baseline', 'central').text(i);
//     }
//   };
// }/// Copyright by Erik Weitnauer, 2014.

/** Visualizes a scene as svg and augments it with information of a SceneNode.
 * It allows highlighting objects by tapping them and interacting with objects
 * by dragging them. It shows the current simulation time in the upper right
 * and shows controls for resetting, playing and pausing the simulation on
 * mouseover */
var SceneInteractor = function(physics_scene, scene_node, svg) {
	this.pscene = physics_scene;
	this.sn = scene_node;
	this.scene = scene_node.scene;
	this.svg = d3.select(svg);
	this.svgg = this.svg.append('g');
	this.width = 145;
	this.vis_scaling = 1;
	this.selected = [];
	this.value_getter = null;
	this.group_getter = null;
	this.metric_color_scale = d3.scale.pow().exponent(1.5).domain([0, 100]).range(['white', '#888']);
	this.ordinal_color_scale = d3.scale.category10();
	this.highlight_mode = 'values'; // 'values' or 'groups' or 'none'

	this.step_interval = 1000/30;        // frequency of stepping the scene when playing in ms
  this.interaction_interval = 1000/30; // frequency of updating the mouse interaction in ms
  this.show_time = true;               // displays current time
  this.show_pos = false;               // displays mouse pos. in world coordinates
  this.playing = false;
  this.drawing = true;
  this.auto_pause = false;
  this.init();
  this.draw();
}

/// Reset all intervals.
SceneInteractor.prototype.release = function() {
  if (this.step_timer) clearInterval(this.step_timer);
  if (this.interaction_timer) clearInterval(this.interaction_timer);
  this.pscene.onWorldChange.removeListener(this.draw);
}

SceneInteractor.prototype.pause = function() {
  this.was_autopaused = false;
  if (!this.playing) return;
  clearInterval(this.step_timer);
  this.step_time = null;
	this.playing = false;
	this.updatePlayButton();
}

SceneInteractor.prototype.play = function() {
  if (this.playing) return;
  var self = this;
  self.was_autopaused = false;
  this.step_timer = setInterval(function() {
    self.pscene.step();
    if (self.auto_pause && self.pscene.countAwake() === 0) {
      self.pause();
      self.was_autopaused = true;
    }
  }, this.step_interval);
  this.playing = true;
  this.updatePlayButton();
}

SceneInteractor.prototype.toggle = function() {
	console.log('toggling');
  if (this.playing) this.pause();
  else this.play();
  console.log(this.playing);
}

SceneInteractor.prototype.reset = function() {
  this.pscene.reset();
}

SceneInteractor.prototype.init = function() {
  var self = this;
  this.pscene.onWorldChange.addListener(function() { self.draw.apply(self) });

  this.addControls();

  // create text element for time
  this.text_el = this.svg.append('text')
                     .style('text-anchor', 'end')
                     .style('dominant-baseline', 'hanging')
                     .style('font-family', 'Lato')
                     .style('font-size', 10)
                     .style('fill', '#85A1C8')
                     .attr({x: this.width-5, y: 5});

	// setup mouse interaction
  this.mouseDown = false;
  this.mousePoint = new b2Vec2(0,0);
  this.svg.style('pointer-events', 'all');
  this.svg.on("mouseover", this.showControls.bind(this));
  this.svg.on("mouseout", this.hideControls.bind(this));
  // this.svg.on("mousemove", function() {
  //   self.handleMouseMove.apply(self, arguments);
  // }, true);
  // this.svg.on("mousedown", function() {
  //   self.mouseDown = true;
  // }, true);
  // this.svg.on("mouseup", function() {
  //   // if we didn't move a body, it was a normal click and we toggle the playing state
  //   //if (!self.mouseJoint) self.toggle.apply(self);
  //   self.handleMouseUp.apply(self, arguments);
  // }, true);
  // this.svg.on("dblclick", function() {
  //   self.pause();
  //   self.reset();
  // }, true);

  // setup timers
  this.interaction_timer = setInterval(function() {
    self.updateInteraction.apply(self);
  }, this.interaction_interval);

  // get position of canvas on screen and update on scrolling to get the mouse position relative to the canvas.
  this.svgg_position = this.getElementPosition(this.svgg.node());
  window.addEventListener("scroll", function() { self.svgg_position = self.getElementPosition(self.svgg.node()) });
};

SceneInteractor.prototype.addControls = function() {
	var thiz = this;
	this.play_btn = this.svg.append('g').attr('transform', 'translate(15,15)')
	  .attr('visibility', 'hidden')
	  .on('click', this.toggle.bind(this));
	this.play_btn.append('circle')
	    .attr({fill: '#85A1C8', r: 10});
	this.play_btn.append('path')
	    .attr({d: 'M-3,-4 L5,0 L-3,4 Z', fill: 'white'});
	this.play_btn.append('rect')
	    .attr({x: -4, y: -4, width: 3, height: 8, fill: 'white', visibility: 'hidden'});
	this.play_btn.append('rect')
	    .attr({x: 1, y: -4, width: 3, height: 8, fill: 'white', visibility: 'hidden'});
	this.reset_btn = this.svg.append('g').attr('transform', 'translate(40,15)')
	  .on('click', function() { thiz.pause(); thiz.reset() })
	  .attr('visibility', 'hidden');
	this.reset_btn.append('circle')
	    .attr({fill: '#85A1C8', r: 10});
	this.reset_btn.append('rect')
		  .attr({ x: -3.5, y: -3.5, width: 7, height: 7, fill: 'white'});
}

SceneInteractor.prototype.showControls = function() {
	this.play_btn.attr('visibility', 'visible');
	this.reset_btn.attr('visibility', 'visible');
}

SceneInteractor.prototype.hideControls = function() {
	this.play_btn.attr('visibility', 'hidden');
	this.reset_btn.attr('visibility', 'hidden');
}

SceneInteractor.prototype.updatePlayButton = function() {
	this.play_btn.select('path')
	    .attr('visibility', this.playing ? 'hidden' : 'visible');
	this.play_btn.selectAll('rect')
	    .attr('visibility', this.playing ? 'visible' : 'hidden');
}

SceneInteractor.prototype.getElementPosition = function(el) {
  var x = el.offsetLeft - document.documentElement.scrollLeft,
      y = el.offsetTop - document.documentElement.scrollTop;
  while (el.offsetParent) {
  	el = el.offsetParent;
    x += el.offsetLeft - el.scrollLeft;
    y += el.offsetTop - el.scrollTop;
  }
  return {x: x, y: y};
}

SceneInteractor.prototype.handleMouseUp = function(evt) {
  this.mouseDown = false;
  if (this.mouseJoint) {
    this.pscene.world.DestroyJoint(this.mouseJoint);
	  this.mouseJoint = null;
	}
}

SceneInteractor.prototype.handleMouseMove = function(evt) {
  this.mousePoint.x = (evt.clientX - this.svgg_position.x) / this.draw_scale;
  this.mousePoint.y = (evt.clientY - this.svgg_position.y) / this.draw_scale;
  if (this.mouseDown && !this.playing) {
    if (this.was_autopaused) this.play();
    else this.pscene.step();
  }
  // draw new mouse position if we would not redraw otherwise
  if (this.draw_pos && !this.mouseDown && !this.playing) this.draw();
}

/** Checks which object is at the passed position, a b2Vec2. Returns the selected body. */
SceneInteractor.prototype.getBodyAtMouse = function() {
  var aabb = new b2AABB();
  var p = this.mousePoint;
	aabb.lowerBound.Set(p.x - 0.001, p.y - 0.001);
	aabb.upperBound.Set(p.x + 0.001, p.y + 0.001);

	var body = null;
  // first search for body
	var filter = function(fixture) {
	  var b = fixture.GetBody();
  	if (b.GetType() != b2Body.b2_staticBody && fixture.GetShape().TestPoint(b.GetTransform(), p)) {
      body = b;
      return false;
    }
    return true;
  }
  this.pscene.world.QueryAABB(filter, aabb);

  return body;
}

/// Updates mouse joint target and creates it if neccessary.
/// If mouse button is not down, it will destroy the joint.
SceneInteractor.prototype.updateInteraction = function() {
  if (this.mouseDown && !this.mouseJoint) {
    var body = this.getBodyAtMouse();
    if (body) {
      var md = new b2MouseJointDef();
      md.bodyA = this.pscene.world.GetGroundBody();
      md.bodyB = body;
      md.target = this.mousePoint;
      md.collideConnected = true;
      md.maxForce = 300.0 * body.GetMass();
      this.mouseJoint = this.pscene.world.CreateJoint(md);
      body.SetAwake(true);
    }
  }
  if (this.mouseJoint) {
    if (this.mouseDown) {
      this.mouseJoint.SetTarget(this.mousePoint);
    } else {
      this.pscene.world.DestroyJoint(this.mouseJoint);
      this.mouseJoint = null;
    }
  }
}

SceneInteractor.prototype.addShape = function(container, shape) {
	var el = d3.select(container);
	var self = this;
	var se;
	if (shape instanceof Circle) {
		se = el.append('svg:circle')
		       .attr('cx', 0)
		       .attr('cy', 0)
		       .attr('r', shape.r);
	} else if (shape instanceof Polygon) {
		se = shape.closed ? el.append('svg:polygon') : el.append('svg:polyline');
		se.attr('points', shape.pts.map(function (pt) { return pt.x+','+pt.y }).join(' '));
	}
	se.classed('shape', true)
	  .classed('static', function (d) { return !d.movable })
	  .classed('dynamic', function (d) { return d.movable })
	  .attr('stroke-width', function (d) { return d.style['stroke-width'] })
	  .on('click', function(d) {
	  	d3.event.stopPropagation();
	  	if (d3.event.shiftKey) self.toggleSelection(d);
	  	else self.selectShapes([d]);
	  	if (self.value_getter) console.log(self.value_getter(d.object_node));
	  	console.log("obj=", d.object_node.describe());
	  	obj = d.object_node;
	  });
}

SceneInteractor.prototype.addText = function(container) {
	container
		.filter(function (d) { return d.movable })
		.append('text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .text(function (d) { return d.id });
}

SceneInteractor.prototype.updateScales = function() {
	if (this.value_getter && this.highlight_mode == 'values') {
		var ext = d3.extent(this.sn.objs, this.value_getter);
  	this.metric_color_scale.domain([ext[0]/2, (100+ext[1])/2]);
	}
}

SceneInteractor.prototype.updateScene = function() {
	if (!this.drawing) return;
  this.updateScales();
	var thiz = this;

	// select
	//this.svg.attr('pointer-events', 'visible').on('click', function () { thiz.selectShapes([]) });
	var no_border = function(shape) { return shape.id !== '|' };
	var gs = this.svgg.attr('pointer-events', 'visiblePainted')
		  .selectAll('.shape-container-pos')
		 	.data( this.scene.shapes.filter(no_border)
		 		   , function(shape) { return shape.id });

	// enter
	var g_pos = gs.enter()
	  .append('g')
		.classed('shape-container-pos', true);
	g_pos
		.append('g')
		.classed('shape-container-rot', true)
		.each(function(shape) { thiz.addShape(this, shape) });
	g_pos.call(this.addText);

	// update
	gs.attr('transform', function (d) { return "translate(" + d.x + "," +  d.y + ")" });
	gs.select('.shape-container-rot').attr('transform', function (d) { return "rotate(" + d.rot*180/Math.PI + ")" });
	gs.select('.shape')
	  .classed('unseen', function (d) { return d.object_node === undefined });
	if (this.highlight_mode == 'values' && this.value_getter) {
		gs.select('.shape')
		  .filter(function(d) {return d.movable})
			.style('fill', function (d) { return thiz.metric_color_scale(thiz.value_getter(d.object_node)) })
	} else if (this.highlight_mode == 'groups' && this.group_getter) {
		gs.select('.shape')
			.filter(function(d) {return d.movable})
		  .style('fill', function (d) { return thiz.ordinal_color_scale(thiz.group_getter(d)) })
	} else {
		gs.select('.shape')
			.filter(function(d) {return d.movable})
		  .style('fill', '#aaa');
	}

	// remove
	gs.exit().remove();

	this.svg.classed('active', this.sn.active);
	this.svg.style('background-color', null);

}

SceneInteractor.prototype.draw = function() {
  if (!this.drawing) return;
  this.updateScene();
  if (this.show_time || this.show_pos) {
    var text = '';
    if (this.show_pos && this.mousePoint) text += ' x='+this.mousePoint.x.toFixed(2) + " y=" + this.mousePoint.y.toFixed(2);
    if (this.show_time) text += ' t=' + this.pscene.getTime().toFixed(2);
    this.text_el.text(text);
  }
}

SceneInteractor.prototype.scaling = function(val) {
	if (arguments.length === 0) return this.val;
	this.vis_scaling = val;
	this.svgg.attr('transform', 'scale(' + this.vis_scaling + ')');
	return this;
}

SceneInteractor.prototype.applySelector = function(sel) {
	var gn = sel.applyToScene(this.sn, true);
	this.selectShapes(gn.objs);
}

SceneInteractor.prototype.applySolution = function(sol) {
	var res = sol.check_scene(this.sn, true);
	this.selectShapes(res.group.objs);
	//if (sol.isPotentialSolution()) {
		var color = res.match ? '#efe' : '#fee';
		this.svg.style('background-color', color);
	//}
}

SceneInteractor.prototype.colorize_values = function(value_getter) {
	this.highlight_mode = 'values';
	if (value_getter) this.value_getter = value_getter;
	this.draw();
}

SceneInteractor.prototype.colorize_groups = function(group_getter) {
	this.highlight_mode = 'groups';
	this.group_getter = group_getter;
	this.draw();
}

SceneInteractor.prototype.toggleSelection = function(node) {
	var new_sel;
	if (this.selected.indexOf(node) != -1) {
		new_sel = this.selected.filter(function (n) { return n!==node });
	} else {
		new_sel = this.selected.slice();
		new_sel.push(node);
	}
	this.selectShapes(new_sel);
}

SceneInteractor.prototype.selectShapes = function(shapes) {
	for (var i=0; i<this.selected.length; i++) this.selected[i].selected = false;
	this.selected = shapes;
	for (var i=0; i<this.selected.length; i++) this.selected[i].selected = true;
	this.svgg.selectAll('.shape')
	    .classed('selected', function (d) { return d.selected });
}
/// Labels are only 'stable' or 'unstable', but internally there are four values:
/// 'moving', 'unstable', 'slightly unstable' and 'stable'. The mapping of values
/// to labels should depend on the context later, but is fixed for now.
StableAttribute = function(obj) {
  this.perceive(obj);
}
StableAttribute.prototype.key = 'stable';
StableAttribute.prototype.targetType = 'obj';
StableAttribute.prototype.arity = 1;
StableAttribute.prototype.constant = false;

/// Returns an StableAttribute instance, which is the perception of the passed
/// object's stability. Possible values are 'very stable', 'stable', 'unstable'
/// and 'very unstable'.
StableAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = this.checkStability(obj.phys_obj, obj.object_node.scene_node.oracle);
}

StableAttribute.prototype.get_activity = function() {
  if (this.val === 'stable') return 1;
  if (this.val === 'slightly unstable') return 0.6;
  if (this.val === 'unstable') return 0.1;
  return 0;
}

StableAttribute.prototype.get_label = function() {
  return 'stable';
}

/// Returns whether the object is 'stable', 'unstable' or 'moving'.
/// An object is 'moving', if its speed is above 0.25. An object is
/// considered 'stable' if, after pushing it with an impulse as big as its mass,
/// after 0.3 seconds of simulation, its position changed less than 0.2, its rotation
/// changed less than 9 degrees and its speed is less than 0.4. If the body is
/// a circle, the rotation must change less than 60 degrees.
/// An object is considered 'slightly unstable' if, after pushing it with an impulse as half as
/// big as its mass, after 0.3 seconds of simulation, it does not exceed 2/3 of the above
/// values.
/// For an static object 'stable' is returned.
StableAttribute.prototype.checkStability = function(body, oracle) {
	var max_initial_v = 0.25;
	var max_v = 0.4;
	var max_dx = 0.2;
	var max_drot_circle = 1.047, max_drot = 0.157;
	if (oracle.isStatic(body)) return 'stable';
	var is_stable = function(dir, soft) {
		var rot0 = body.GetAngle();
		var apply_impulse = function() {oracle.applyCentralImpulse(body, dir, soft ? 'small' : 'medium')};
    return oracle.analyzeFuture(0.3, apply_impulse, function() {
    	//console.log('pushing', soft ? 'softly' : '', 'to the', dir);
    	var v = body.m_linearVelocity.Length();
    	var factor = soft ? 2/3 : 1.0;
			//console.log('  speed:',v);
    	if (v >= max_v*factor) return false;
    	var dx = oracle.pscene.getBodyDistance(body);
      //console.log('  dist:',dx);
      if (dx >= max_dx*factor) return false;
      var drot = Point.norm_angle(body.GetAngle() - rot0);
      //console.log('  rot:',drot);
      if ( body.IsCircle() && Math.abs(drot) >= max_drot_circle*factor ||
          !body.IsCircle() && Math.abs(drot) >= max_drot*factor) return false;
      return true;
    });
  }
  // check for 'moving'
  var v = body.m_linearVelocity.Length();
  //console.log('curr. vel.', v);
  if (v > max_initial_v) return 'moving';
  // check for pushing left and right
  if (is_stable('left', false) && is_stable('right', false)) return 'stable';
  if (is_stable('left', true) && is_stable('right', true)) return 'slightly unstable';
  return 'unstable';
}
/// Labels are only 'stable' or 'unstable', but internally there are four values:
/// 'moving', 'unstable', 'slightly unstable' and 'stable'. The mapping of values
/// to labels should depend on the context later, but is fixed for now.
UnstableAttribute = function(obj) {
  this.perceive(obj);
}
UnstableAttribute.prototype.key = 'unstable';
UnstableAttribute.prototype.targetType = 'obj';
UnstableAttribute.prototype.arity = 1;
UnstableAttribute.prototype.constant = false;

/// Returns an UnstableAttribute instance, which is the perception of the passed
/// object's stability. Possible values are 'very stable', 'stable', 'unstable'
/// and 'very unstable'.
UnstableAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = obj.object_node.get('stable').val;
}

UnstableAttribute.prototype.get_activity = function() {
  if (this.val === 'stable') return 0;
  if (this.val === 'slightly unstable') return 0.4;
  if (this.val === 'unstable') return 0.9;
  return 1;
}

UnstableAttribute.prototype.get_label = function() {
  return 'unstable';
}

/// Returns whether the object is 'stable', 'unstable' or 'moving'.
/// An object is 'moving', if its speed is above 0.25. An object is
/// considered 'stable' if, after pushing it with an impulse as big as its mass,
/// after 0.3 seconds of simulation, its position changed less than 0.2, its rotation
/// changed less than 9 degrees and its speed is less than 0.4. If the body is
/// a circle, the rotation must change less than 60 degrees.
/// An object is considered 'slightly unstable' if, after pushing it with an impulse as half as
/// big as its mass, after 0.3 seconds of simulation, it does not exceed 2/3 of the above
/// values.
/// For an static object 'stable' is returned.
UnstableAttribute.prototype.checkStability = function(body, oracle) {
	var max_initial_v = 0.25;
	var max_v = 0.4;
	var max_dx = 0.2;
	var max_drot_circle = 1.047, max_drot = 0.157;
	if (oracle.isStatic(body)) return 'stable';
	var is_stable = function(dir, soft) {
		var rot0 = body.GetAngle();
		var apply_impulse = function() {oracle.applyCentralImpulse(body, dir, soft ? 'small' : 'medium')};
    return oracle.analyzeFuture(0.3, apply_impulse, function() {
    	//console.log('pushing', soft ? 'softly' : '', 'to the', dir);
    	var v = body.m_linearVelocity.Length();
    	var factor = soft ? 2/3 : 1.0;
			//console.log('  speed:',v);
    	if (v >= max_v*factor) return false;
    	var dx = oracle.pscene.getBodyDistance(body);
      //console.log('  dist:',dx);
      if (dx >= max_dx*factor) return false;
      var drot = Point.norm_angle(body.GetAngle() - rot0);
      //console.log('  rot:',drot);
      if ( body.IsCircle() && Math.abs(drot) >= max_drot_circle*factor ||
          !body.IsCircle() && Math.abs(drot) >= max_drot*factor) return false;
      return true;
    });
  }
  // check for 'moving'
  var v = body.m_linearVelocity.Length();
  //console.log('curr. vel.', v);
  if (v > max_initial_v) return 'moving';
  // check for pushing left and right
  if (is_stable('left', false) && is_stable('right', false)) return 'stable';
  if (is_stable('left', true) && is_stable('right', true)) return 'slightly unstable';
  return 'unstable';
}
/// For now, this is a all or nothing decision between "can be moved up" or "can't be moved up".
/// Depends on whether the after applying a upward directed force for 5 seconds the object touches
/// the upper frame.
MovableUpAttribute = function(obj) {
  this.perceive(obj);
}
MovableUpAttribute.prototype.key = 'can_move_up';
MovableUpAttribute.prototype.targetType = 'obj';
MovableUpAttribute.prototype.arity = 1;
MovableUpAttribute.prototype.constant = false;

/// Returns an MovableUpAttribute instance, which is the perception of whether the passed
/// object can be moved up. Possible values are 1 or 0.
MovableUpAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = this.checkMovability('up', obj.phys_obj, obj.object_node.scene_node.oracle);
}

MovableUpAttribute.prototype.get_activity = function() {
  return this.val ? 1 : 0;
}

MovableUpAttribute.prototype.get_label = function() {
	return 'can-move-up';
}

/// Returns true if the object can be moved towards the passed direction, one of
/// 'up', 'left' or 'right'. This is the case if pulling the object with a small force
/// for 4 seconds into the respective direction will result in the object beeing at
/// the respective edge of the frame or having moved substantially far in the direction.
/// For now only works for 'up'.
MovableUpAttribute.prototype.checkMovability = function(dir, body, oracle) {
	if (oracle.isStatic(body)) return false;

  var f = new b2Vec2(0, -body.GetMass()*12);
  //if (dir == 'up') f = new b2Vec2(0, -body.GetMass()*12);
  //else if (dir == 'left') f = new b2Vec2(-body.GetMass()*2, 0);
  //else if (dir == 'right') f = new b2Vec2(body.GetMass()*2, 0);
  //else throw "unknown direction '" + dir + "'";

  // apply force to the body (will be cleared on reset after analyzeFuture automatically)
  var pull = function() {
    body.SetSleepingAllowed(false);
    body.ApplyForce(f, body.GetWorldCenter());
  }

  return oracle.analyzeFuture(2.5, pull, function() {
    // check whether object is close to top of frame
    var res = oracle.getTouchedBodiesWithPos(body);
    return res.some(function (e) {
      if (e.body.master_obj.id !== "|") return false;
      for (var i=0; i<e.pts.length; i++) {
        if (e.pts[i].y < 0.1) return true;
      }
    });
  });
}
ShapeAttribute = function(obj) {
  this.perceive(obj);
}
ShapeAttribute.prototype.key = 'shape';
ShapeAttribute.prototype.targetType = 'obj';
ShapeAttribute.prototype.arity = 1;
ShapeAttribute.prototype.constant = true;

/// Returns an ShapeAttribute instance, which is the perception of the passed
/// object's shape. Possible shapes are circle, triangle, rectangle, square and
/// unknown.
ShapeAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = ShapeAttribute.determineShape(obj);
}

ShapeAttribute.prototype.get_activity = function() {
  return this.val == '?' ? 0 : 1;
}

ShapeAttribute.prototype.get_label = function() {
  return this.val;
}

ShapeAttribute.determineShape = function(shape) {
  // determine shape type (circle, triangle, square, rectangle or unknown)
  if (shape instanceof Polygon) {
    if (!shape.closed) return 'unknown';
    shape.order_vertices();
    if (shape.pts.length == 3) return 'triangle';
    if (ShapeAttribute.isRectangle(shape)) {
      // in square, all edges should have the same length
      var edges = shape.get_edge_lengths(true); // sorted by length
      if (edges[0]/edges[3] < 0.7) return 'rectangle';
      else return 'square';
    }
    else return 'unknown';
  } else if (shape instanceof Circle) return 'circle';
  else return 'unknown';
}

/// Returns true, if Polygon has 4 corners, all with angles in [70,110] degree.
ShapeAttribute.isRectangle = function(poly) {
  if (poly.pts.length != 4) return false;
  var a_max = 110 * Math.PI / 180, a_min = 70 * Math.PI / 180;
  for (var i=0; i<poly.pts.length; ++i) {
    if (poly.angle(i) > a_max || poly.angle(i) < a_min) return false;
  }
  return true;
}

CircleAttribute = function(obj) {
  this.perceive(obj);
}
CircleAttribute.prototype.key = 'circle';
CircleAttribute.prototype.targetType = 'obj';
CircleAttribute.prototype.arity = 1;
CircleAttribute.prototype.constant = true;
CircleAttribute.prototype.base_level = true;

/// Returns an CircleAttribute instance, which is the perception of the passed
/// object's shape. Possible shapes are circle, triangle, rectangle, square and
/// unknown.
CircleAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = CircleAttribute.circleness(obj);
}

CircleAttribute.prototype.get_activity = function() {
  return this.val;
}

CircleAttribute.prototype.get_label = function() {
  return this.key;
}

CircleAttribute.circleness = function(shape) {
  if (shape instanceof Circle) return 1;
  else return 0;

  // cool feature:
  // check roundness of an object by getting its convex hull and
  // then see how much the difference between the convex hull corner & midpoints
  // and the "radius" of the convex hull
}

SquareAttribute = function(obj) {
  this.perceive(obj);
}
SquareAttribute.prototype.key = 'square';
SquareAttribute.prototype.targetType = 'obj';
SquareAttribute.prototype.arity = 1;
SquareAttribute.prototype.constant = true;
SquareAttribute.prototype.base_level = true;

/// Returns an SquareAttribute instance, which is the perception of the passed
/// object's shape. Possible shapes are circle, triangle, rectangle, square and
/// unknown.
SquareAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = SquareAttribute.squareness(obj);
}

SquareAttribute.prototype.get_activity = function() {
  return this.val;
}

SquareAttribute.prototype.get_label = function() {
  return this.key;
}

SquareAttribute.squareness = function(shape) {
  if (shape instanceof Polygon) {
    if (!shape.closed) return 0;
    shape.order_vertices();
    if (SquareAttribute.isRectangle(shape)) {
      // in square, all edges should have the same length
      var edges = shape.get_edge_lengths(true); // sorted by length
      if (edges[0]/edges[3] < 0.7) return 0.3;
      else return 1;
    }
  }
  return 0;
}

/// Returns true, if Polygon has 4 corners, all with angles in [70,110] degree.
SquareAttribute.isRectangle = function(poly) {
  if (poly.pts.length != 4) return false;
  var a_max = 110 * Math.PI / 180, a_min = 70 * Math.PI / 180;
  for (var i=0; i<poly.pts.length; ++i) {
    if (poly.angle(i) > a_max || poly.angle(i) < a_min) return false;
  }
  return true;
}
RectangleAttribute = function(obj) {
  this.perceive(obj);
}
RectangleAttribute.prototype.key = 'rect';
RectangleAttribute.prototype.targetType = 'obj';
RectangleAttribute.prototype.arity = 1;
RectangleAttribute.prototype.constant = true;
RectangleAttribute.prototype.base_level = true;

/// Returns an RectangleAttribute instance, which is the perception of the passed
/// object's shape. Possible shapes are circle, triangle, rectangle, square and
/// unknown.
RectangleAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = RectangleAttribute.rectness(obj);
}

RectangleAttribute.prototype.get_activity = function() {
  return this.val;
}

RectangleAttribute.prototype.get_label = function() {
  return this.key;
}

RectangleAttribute.rectness = function(shape) {
  if (shape instanceof Polygon) {
    if (!shape.closed) return 0;
    shape.order_vertices();
    if (RectangleAttribute.isRectangle(shape)) {
      // in square, all edges should have the same length
      var edges = shape.get_edge_lengths(true); // sorted by length
      if (edges[0]/edges[3] < 0.7) return 1;
      else return 0.4;
    }
  }
  return 0;
}

/// Returns true, if Polygon has 4 corners, all with angles in [70,110] degree.
RectangleAttribute.isRectangle = function(poly) {
  if (poly.pts.length != 4) return false;
  var a_max = 110 * Math.PI / 180, a_min = 70 * Math.PI / 180;
  for (var i=0; i<poly.pts.length; ++i) {
    if (poly.angle(i) > a_max || poly.angle(i) < a_min) return false;
  }
  return true;
}
TriangleAttribute = function(obj) {
  this.perceive(obj);
}
TriangleAttribute.prototype.key = 'triangle';
TriangleAttribute.prototype.targetType = 'obj';
TriangleAttribute.prototype.arity = 1;
TriangleAttribute.prototype.constant = true;
TriangleAttribute.prototype.base_level = true;

/// Returns an TriangleAttribute instance, which is the perception of the passed
/// object's shape. Possible shapes are circle, triangle, rectangle, square and
/// unknown.
TriangleAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = TriangleAttribute.triangleness(obj);
}

TriangleAttribute.prototype.get_activity = function() {
  return this.val;
}

TriangleAttribute.prototype.get_label = function() {
  return this.key;
}

TriangleAttribute.triangleness = function(shape) {
  if ((shape instanceof Polygon) && shape.closed && shape.pts.length === 3) return 1;
  return 0;
}
/// Reflects whether an object is moving at the moment or will be moving 0.1 seconds
/// in the future. The activation is 0.5 for a linear velocity of 0.1.
MovesAttribute = function(obj) {
  this.perceive(obj);
}
MovesAttribute.prototype.key = 'moves';
MovesAttribute.prototype.targetType = 'obj';
MovesAttribute.prototype.arity = 1;
MovesAttribute.prototype.constant = true;

// google: "plot from -0.5 to 5, 1/(1+exp(40*(0.1-x)))"
MovesAttribute.membership = function(lin_vel) {
  var a = 40; // steepness of sigmoid function
  var m = 0.1; // linear velocity at which sigmoid is 0.5
  return 1/(1+Math.exp(a*(m-lin_vel)));
}

MovesAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  // vel. right now
  var body = obj.phys_obj;
  this.val = body.m_linearVelocity.Length();
  // vel. in 0.1 seconds
  obj.object_node.scene_node.oracle.analyzeFuture(0.1, null, (function() {
  	this.val_soon = body.m_linearVelocity.Length();
  }).bind(this));
}

MovesAttribute.prototype.get_activity = function() {
  return Math.max(MovesAttribute.membership(this.val), MovesAttribute.membership(this.val_soon));
}

MovesAttribute.prototype.get_label = function() {
  return 'moves';
}
SmallAttribute = function(obj) {
  this.perceive(obj);
}
SmallAttribute.prototype.key = 'small';
SmallAttribute.prototype.targetType = 'obj';
SmallAttribute.prototype.arity = 1;
SmallAttribute.prototype.constant = true;
SmallAttribute.prototype.base_level = true;

// google: "plot from -10 to 1000, 1-1/(1+exp(4*(1.8-x/100)))"
SmallAttribute.membership = function(area) {
  var a = 4; // steepness of sigmoid function
  var m = 1.8; // area at which sigmoid is 0.5 (whole scene has area 100)
  var size = 100;
  return 1-1/(1+Math.exp(a*(m-area/size/size*100)));
}

SmallAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = Math.abs(obj.area());
}

SmallAttribute.prototype.get_activity = function() {
  return SmallAttribute.membership(this.val);
}

SmallAttribute.prototype.get_label = function() {
  return 'small';
}
LargeAttribute = function(obj) {
  this.perceive(obj);
}
LargeAttribute.prototype.key = 'large';
LargeAttribute.prototype.targetType = 'obj';
LargeAttribute.prototype.arity = 1;
LargeAttribute.prototype.constant = true;
LargeAttribute.prototype.base_level = true;

// google: "plot from -10 to 1000, 1/(1+exp(4*(2-x/100)))"
LargeAttribute.membership = function(area) {
  var a = 4; // steepness of sigmoid function
  var m = 2.0; // area at which sigmoid is 0.5 (whole scene has area 100)
  var size = 100;
  return 1/(1+Math.exp(a*(m-area/size/size*100)));
}

LargeAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = Math.abs(obj.area());
}

LargeAttribute.prototype.get_activity = function() {
  return LargeAttribute.membership(this.val);
}

LargeAttribute.prototype.get_label = function() {
  return 'large';
}
LeftAttribute = function(obj) {
  this.perceive(obj);
}
LeftAttribute.prototype.key = "left_pos";
LeftAttribute.prototype.targetType = 'obj';
LeftAttribute.prototype.arity = 1;
LeftAttribute.prototype.size = 100; // scene size
LeftAttribute.prototype.constant = false;

LeftAttribute.prototype.membership = function(x) {
	return 1-1/(1+Math.exp(20*(0.4-x/this.size)));
}

LeftAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = obj.x;
}

LeftAttribute.prototype.get_activity = function() {
  return this.membership(this.val);
}

LeftAttribute.prototype.get_label = function() {
  return 'left';
}
LeftMostAttribute = function(obj) {
  this.adaptDomain(obj.object_node.scene_node.objs);
  this.perceive(obj);
}
LeftMostAttribute.prototype.key = "left_most";
LeftMostAttribute.prototype.targetType = 'obj';
LeftMostAttribute.prototype.arity = 1;
LeftMostAttribute.prototype.constant = false;

LeftMostAttribute.prototype.adaptDomain = function(objs) {
  var best, best_obj = null;
  for (var i=0; i<objs.length; i++) {
    if (!(objs[i] instanceof ObjectNode)) continue;
    var x = objs[i].obj.phys_obj.GetPosition().x;
    if (!best_obj || best > x) {
      best_obj = objs[i];
      best = x;
    }
  }
	this.leftmost_x = best_obj.obj.x;
}

LeftMostAttribute.prototype.membership = function(x) {
  return CloseRelationship.membership(2.5*Math.abs(this.val-this.leftmost_x));
}

LeftMostAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = obj.x;
}

LeftMostAttribute.prototype.get_activity = function() {
  return this.membership(this.val);
}

LeftMostAttribute.prototype.get_label = function() {
  return 'left-most';
}
RightAttribute = function(obj) {
  this.perceive(obj);
}
RightAttribute.prototype.key = "right_pos";
RightAttribute.prototype.targetType = 'obj';
RightAttribute.prototype.arity = 1;
RightAttribute.prototype.size = 100; // scene size
RightAttribute.prototype.constant = false;

RightAttribute.prototype.membership = function(x) {
	return 1-1/(1+Math.exp(20*(0.4-x/this.size)));
}

RightAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = this.size-obj.x;
}

RightAttribute.prototype.get_activity = function() {
  return this.membership(this.val);
}

RightAttribute.prototype.get_label = function() {
  return 'right';
}
RightMostAttribute = function(obj) {
  this.adaptDomain(obj.object_node.scene_node.objs);
  this.perceive(obj);
}
RightMostAttribute.prototype.key = "right_most";
RightMostAttribute.prototype.targetType = 'obj';
RightMostAttribute.prototype.arity = 1;
RightMostAttribute.prototype.constant = false;

RightMostAttribute.prototype.adaptDomain = function(objs) {
  var best, best_obj = null;
  for (var i=0; i<objs.length; i++) {
    if (!(objs[i] instanceof ObjectNode)) continue;
    var x = objs[i].obj.phys_obj.GetPosition().x;
    if (!best_obj || best < x) {
      best_obj = objs[i];
      best = x;
    }
  }
	this.rightmost_x = best_obj.obj.x;
}

RightMostAttribute.prototype.membership = function(x) {
  return CloseRelationship.membership(2.5*Math.abs(this.val-this.rightmost_x));
}

RightMostAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = obj.x;
}

RightMostAttribute.prototype.get_activity = function() {
  return this.membership(this.val);
}

RightMostAttribute.prototype.get_label = function() {
  return 'right-most';
}
BottomAttribute = function(obj) {
  this.adaptDomain(obj.object_node.scene_node.ground);
  this.perceive(obj);
}
BottomAttribute.prototype.key = "bottom_pos";
BottomAttribute.prototype.targetType = 'obj';
BottomAttribute.prototype.arity = 1;
BottomAttribute.prototype.constant = false;

BottomAttribute.prototype.adaptDomain = function(ground) {
	var bb = ground.bounding_box();
	this.maxy = ground.y+bb.y+bb.height;
}

BottomAttribute.prototype.membership = function(x) {
	return 1-1/(1+Math.exp(20*(0.3-x/this.maxy)));
}

BottomAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = this.maxy-obj.y; // y get smaller towards the top
}

BottomAttribute.prototype.get_activity = function() {
  return this.membership(this.val);
}

BottomAttribute.prototype.get_label = function() {
  return 'bottom';
}
/// Reflects whether an object is moving at the moment or will be moving 0.1 seconds
/// in the future. The activation is 0.5 for a linear velocity of 0.1.
SingleAttribute = function(obj) {
  this.perceive(obj);
}
SingleAttribute.prototype.key = 'single';
SingleAttribute.prototype.targetType = 'obj';
SingleAttribute.prototype.arity = 1;
SingleAttribute.prototype.constant = false;

// Input this at google: plot 1/(1+exp(30*(0.05-x/100))) from -10 to 110
SingleAttribute.membership = function(dist) {
  var a_far = 40; // steepness of sigmoid function
  var m_far = 0.03; // distance at which sigmoid is 0.5 (on scale 0...1)
  var size = 100; // scene width and height
  return 1/(1+Math.exp(a_far*(m_far-dist/size)));
}

SingleAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  var other = obj.object_node.scene_node.oracle.getClosestBodyWithDist(obj.phys_obj);
  if (!other) this.val = 100; // no other objects!
  else this.val = other.dist / obj.phys_scale;
}

SingleAttribute.prototype.get_activity = function() {
  return Math.max(0, SingleAttribute.membership(this.val)
                   - TouchRelationship.membership(this.val));
}

SingleAttribute.prototype.get_label = function() {
  return 'single';
}
TopAttribute = function(obj) {
  this.adaptDomain(obj.object_node.scene_node.ground);
  this.perceive(obj);
}
TopAttribute.prototype.key = "top_pos";
TopAttribute.prototype.targetType = 'obj';
TopAttribute.prototype.arity = 1;
TopAttribute.prototype.constant = false;


TopAttribute.prototype.adaptDomain = function(ground) {
	var bb = ground.bounding_box();
	this.maxy = ground.y+bb.y+bb.height;
}

TopAttribute.prototype.membership = function(x) {
	return 1-1/(1+Math.exp(20*(0.45-x/this.maxy)));
}

TopAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.val = obj.y; // y get smaller towards the top
}

TopAttribute.prototype.get_activity = function() {
  return this.membership(this.val);
}

TopAttribute.prototype.get_label = function() {
  return 'top';
}
TopMostAttribute = function(obj) {
  this.perceive(obj);
}
TopMostAttribute.prototype.key = "top_most";
TopMostAttribute.prototype.targetType = 'obj';
TopMostAttribute.prototype.arity = 1;
TopMostAttribute.prototype.constant = false;

TopMostAttribute.prototype.adaptDomain = function(objs) {
  if (objs.length === 0) return;
  var best, best_obj = null, phys_scale = objs[0].obj.phys_scale;
  for (var i=0; i<objs.length; i++) {
    if (!(objs[i] instanceof ObjectNode)) continue;
    var aabb = objs[i].obj.phys_obj.GetAABB();
    var y = aabb.lowerBound.y;
    if (this.obj === objs[i].obj) this.val = y/phys_scale;
    if (!best_obj || best > y) {
      best_obj = objs[i];
      best = y;
    }
  }
	this.topmost_y = best/phys_scale;
}

TopMostAttribute.prototype.membership = function(x) {
  return CloseRelationship.membership(3.5*Math.abs(this.val-this.topmost_y));
}

TopMostAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  this.adaptDomain(obj.object_node.scene_node.objs);
}

TopMostAttribute.prototype.get_activity = function() {
  return this.membership(this.val);
}

TopMostAttribute.prototype.get_label = function() {
  return 'top-most';
}
OnGroundAttribute = function(obj) {
	this.ground = obj.object_node.scene_node.ground;
  this.perceive(obj);
}
OnGroundAttribute.prototype.key = "on_ground";
OnGroundAttribute.prototype.targetType = 'obj';
OnGroundAttribute.prototype.arity = 1;
OnGroundAttribute.prototype.constant = false;

OnGroundAttribute.prototype.perceive = function(obj) {
  this.obj = obj;
  var touch = obj.object_node.getRel('touch', {other: this.ground.object_node});
  this.val = touch.get_activity();
}

OnGroundAttribute.prototype.get_activity = function() {
  return this.val == '?' ? 0 : this.val;
}

OnGroundAttribute.prototype.get_label = function() {
  return 'on-ground';
}
/// Object beeing left to other object on a scale from 1 (very) to 0 (not at all).
LeftRelationship = function(obj, other) {
  this.perceive(obj, other);
}
LeftRelationship.prototype.key = "left_of";
LeftRelationship.prototype.arity = 2;
LeftRelationship.prototype.targetType = 'obj';
LeftRelationship.prototype.symmetry = false;
LeftRelationship.prototype.constant = false;

LeftRelationship.prototype.perceive = function(obj, other) {
  this.obj = obj;
  this.other = other;
  var left = SpatialRelationAnalyzer(100, 100/2/100, 'left').getMembership(obj, other);
  var right = SpatialRelationAnalyzer(100, 100/2/100, 'right').getMembership(obj, other);
  this.val = Math.max(0, left[1]-right[1]);
}

LeftRelationship.prototype.get_activity = function() {
  if (this.val == '?') return 0;
  return this.val;
}

LeftRelationship.prototype.get_label = function() {
  return 'left-of';
}
/// Object beeing right to other object on a scale from 1 (very) to 0 (not at all).
RightRelationship = function(obj, other) {
  this.perceive(obj, other);
}
RightRelationship.prototype.key = "right_of";
RightRelationship.prototype.targetType = 'obj';
RightRelationship.prototype.arity = 2;
RightRelationship.prototype.symmetry = false;
RightRelationship.prototype.constant = false;

RightRelationship.prototype.perceive = function(obj, other) {
  this.obj = obj;
  this.other = other;
  var left = SpatialRelationAnalyzer(100, 100/2/100, 'left').getMembership(obj, other);
  var right = SpatialRelationAnalyzer(100, 100/2/100, 'right').getMembership(obj, other);
  this.val = Math.max(0, right[1]-left[1]);
}


RightRelationship.prototype.get_activity = function() {
  if (this.val == '?') return 0;
  return this.val;
}

RightRelationship.prototype.get_label = function() {
  return 'right-of';
}
/// Object being left or right to another object on a scale from 1 (very) to 0 (not at all).
BesideRelationship = function(obj, other) {
  this.perceive(obj, other);
}
BesideRelationship.prototype.key = "beside";
BesideRelationship.prototype.targetType = 'obj';
BesideRelationship.prototype.arity = 2;
BesideRelationship.prototype.symmetric = true;
BesideRelationship.prototype.constant = false;

BesideRelationship.prototype.perceive = function(obj, other) {
  this.obj = obj;
  this.other = other;
  var l_pos = SpatialRelationAnalyzer(100, 100/2/100, 'left').getMembership(obj, other);
  var r_pos = SpatialRelationAnalyzer(100, 100/2/100, 'right').getMembership(obj, other);
  var left = Math.max(0, l_pos[1]-r_pos[1]);
  var right = Math.max(0, r_pos[1]-l_pos[1]);
  this.val = Math.max(left, right);
}

BesideRelationship.prototype.get_activity = function() {
  return this.val == '?' ? 0 : this.val;
}

BesideRelationship.prototype.get_label = function() {
  return 'beside';
}
/// Object beeing below to other object on a scale from 1 (very) to 0 (not at all).
BelowRelationship = function(obj, other) {
  this.perceive(obj, other);
}
BelowRelationship.prototype.key = "below";
BelowRelationship.prototype.targetType = 'obj';
BelowRelationship.prototype.arity = 2;
BelowRelationship.prototype.symmetry = false;
BelowRelationship.prototype.constant = false;

BelowRelationship.prototype.perceive = function(obj, other) {
  this.obj = obj;
  this.other = other;
  var above = SpatialRelationAnalyzer(100, 100/2/100, 'above').getMembership(obj, other);
  var below = SpatialRelationAnalyzer(100, 100/2/100, 'below').getMembership(obj, other);
  this.val = Math.max(0, below[1]-above[1]);
}


BelowRelationship.prototype.get_activity = function() {
  if (this.val == '?') return 0;
  else return this.val;
}

BelowRelationship.prototype.get_label = function() {
  return 'below';
}
/// Object beeing above to other object on a scale from 1 (very) to 0 (not at all).
AboveRelationship = function(obj, other) {
  this.perceive(obj, other);
}
AboveRelationship.prototype.key = "above";
AboveRelationship.prototype.targetType = 'obj';
AboveRelationship.prototype.arity = 2;
AboveRelationship.prototype.symmetry = false;
AboveRelationship.prototype.constant = false;

AboveRelationship.prototype.perceive = function(obj, other) {
  this.obj = obj;
  this.other = other;
  var above = SpatialRelationAnalyzer(100, 100/2/100, 'above').getMembership(obj, other);
  var below = SpatialRelationAnalyzer(100, 100/2/100, 'below').getMembership(obj, other);
  this.val_max = above[2];
  this.val_min = above[0];
  this.val = Math.max(0, above[1]-below[1]);
}

AboveRelationship.prototype.get_activity = function() {
  if (this.val == '?') return 0;
  else return this.val;
}

AboveRelationship.prototype.get_label = function() {
  return 'above';
}
TouchRelationship = function(obj, other) {
  this.perceive(obj, other);
}
TouchRelationship.prototype.key = "touch";
TouchRelationship.prototype.targetType = 'obj';
TouchRelationship.prototype.arity = 2;
TouchRelationship.prototype.symmetric = true;
TouchRelationship.prototype.constant = false;

TouchRelationship.membership = function(dist) {
	return dist <= 0.5 ? 1 : 0;
}

TouchRelationship.prototype.perceive = function(obj, other) {
  this.obj = obj;
  this.other = other;
  this.val = obj.phys_obj.distance(other.phys_obj) / obj.phys_scale;
}

TouchRelationship.prototype.get_activity = function() {
  return TouchRelationship.membership(this.val);
}

TouchRelationship.prototype.get_label = function() {
  return 'touches';
}
/// Object is on top of another object if it is above and touches it.
OnTopRelationship = function(obj, other) {
  this.perceive(obj, other);
}
OnTopRelationship.prototype.key = "on_top_of";
OnTopRelationship.prototype.targetType = 'obj';
OnTopRelationship.prototype.arity = 2;
OnTopRelationship.prototype.symmetric = false;
OnTopRelationship.prototype.constant = false;

OnTopRelationship.prototype.perceive = function(obj, other) {
  this.obj = obj;
  this.other = other;
  var touch = obj.object_node.getRel('touch', {other: other.object_node}).get_activity();
  var above = Math.max(obj.object_node.getRel('above', {other: other.object_node}).get_activity()
                      ,other.object_node.getRel('below', {other: obj.object_node}).get_activity());
  this.val = touch * above;
}

OnTopRelationship.prototype.get_activity = function() {
  return this.val == '?' ? 0 : this.val;
}

OnTopRelationship.prototype.get_label = function() {
  return 'on-top-of';
}
FarRelationship = function(obj, other) {
  this.perceive(obj, other);
}
FarRelationship.prototype.key = "far";
FarRelationship.prototype.targetType = 'obj';
FarRelationship.prototype.arity = 2;
FarRelationship.prototype.symmetric = true;
FarRelationship.prototype.constant = false;

// Input this at google: plot 1/(1+exp(20*(0.35-x/100))) from -10 to 110, 1-1/(1+exp(30*(0.2-x/100)))
FarRelationship.membership = function(dist) {
  var a_far = 20; // steepness of sigmoid function
  var m_far = 0.25; // distance at which sigmoid is 0.5 (on scale 0...1)
  var size = 100; // scene width and height
  return 1/(1+Math.exp(a_far*(m_far-dist/size)));
}

FarRelationship.prototype.perceive = function(obj, other) {
  this.obj = obj;
  this.other = other;
  this.val = obj.phys_obj.distance(other.phys_obj) / obj.phys_scale;
}

FarRelationship.prototype.get_activity = function() {
  return FarRelationship.membership(this.val);
}

FarRelationship.prototype.get_label = function() {
  return 'far';
}
/// Group attribute. A group is as far as the smallest distance of
/// any two members is far. Groups with 1 or 0 objects are not far.
FarAttribute = function(group) {
  this.perceive(group);
}
FarAttribute.prototype.key = "far";
FarAttribute.prototype.targetType = 'group';
FarAttribute.prototype.arity = 1;
FarAttribute.prototype.constant = false;

FarAttribute.prototype.perceive = function(group) {
  this.group = group;
  if (group.objs.length < 2) this.val = NaN;
  else {
    this.val = Infinity;
    for (var i=1; i<group.objs.length; i++) for (var j=0; j<i; j++) {
      var dist = group.objs[i].phys_obj.distance(group.objs[j].phys_obj) / group.objs[0].phys_scale;
      if (this.val > dist) this.val = dist;
    }
  }
}

FarAttribute.prototype.get_activity = function() {
  return isNaN(this.val) ? 0 : FarRelationship.membership(this.val);
}

FarAttribute.prototype.get_label = function() {
  return 'far';
}
CloseRelationship = function(obj, other) {
  this.perceive(obj, other);
}
CloseRelationship.prototype.key = "close";
CloseRelationship.prototype.targetType = 'obj';
CloseRelationship.prototype.arity = 2;
CloseRelationship.prototype.symmetric = true;
CloseRelationship.prototype.constant = false;

// Input this at google: plot 1/(1+exp(20*(0.35-x/100))) from -10 to 110, 1-1/(1+exp(30*(0.2-x/100)))
CloseRelationship.membership = function(dist) {
  var a_close = 30; // steepness of sigmoid function
  var m_close = 0.2; // distance at which sigmoid is 0.5 (on scale 0...1)
  var size = 100; // scene width and height
  return 1-1/(1+Math.exp(a_close*(m_close-dist/size)));
}

CloseRelationship.prototype.perceive = function(obj, other) {
  this.obj = obj;
  this.other = other;
  // if both objects are in the same scene, use the physics engine to get
  // the minimum distance between their surfaces
  if (obj.object_node.scene_node === other.object_node.scene_node) {
    this.val = obj.phys_obj.distance(other.phys_obj) / obj.phys_scale;
  }
  /// if the objects are from different scenes, simply compare the distance
  /// of their positions
  else {
    // a bit of scaling to be more permissive
    this.val = Point.len(obj.x-other.x, obj.y-other.y)*2/3;
  }
}

CloseRelationship.prototype.get_activity = function() {
  return CloseRelationship.membership(this.val);
}

CloseRelationship.prototype.get_label = function() {
  return 'close';
}
/// Group attribute. Groups where each object is connected with each other object through
/// a sequence of objects that are no further than X from each other are close to the degree
/// close(X).
/// Groups with 1 or 0 objects are not close.
/// This is a Minimum Spanning Tree problem, and we'll use the Kruskal's algorithm to solve
/// it (see http://en.wikipedia.org/wiki/Kruskal%27s_algorithm).
CloseAttribute = function(group) {
  this.perceive(group);
}
CloseAttribute.prototype.key = "close";
CloseAttribute.prototype.targetType = 'group';
CloseAttribute.prototype.arity = 1;
CloseAttribute.prototype.constant = false;

CloseAttribute.prototype.perceive = function(group) {
  this.group = group;
  if (group.objs.length < 2) this.val = NaN;
  else {
    // var pobjs = group.objs.map(function (on) { return on.phys_obj });
    // var tgs = group.scene_node.oracle.getSpatialGroups(20 * group.objs[0].phys_scale, pobjs);
    // if (tgs.length == 1) this.val = 1;
    // else this.val = 0;
    var nodes = [];
    for (var i=0; i<group.objs.length; i++) { nodes.push(i) }
    var edges = [], scale = group.objs[0].phys_scale;
    for (var i=1; i<group.objs.length; i++) for (var j=0; j<i; j++) {
      edges.push({a:i, b:j, dist: group.objs[i].phys_obj.distance(group.objs[j].phys_obj) / scale});
    };
    var mst = CloseAttribute.getMST(nodes, edges);
    // the last edge in the MST has the bigges distance
    this.val = mst[mst.length-1].dist;
  }
}

CloseAttribute.prototype.get_activity = function() {
  return (isNaN(this.val) ? 0 : CloseRelationship.membership(this.val));
}

CloseAttribute.prototype.get_label = function() {
  return 'close';
}

/// Nodes should be numbers, edges should be {a: node1, b: node2, dist: 1.34}.
CloseAttribute.getMST = function(nodes, edges) {
  var mst = [];
  var sets = nodes.map(function(node) { var s = {}; s[node] = true; return s });
  edges.sort(function(a,b) { return a.dist-b.dist} );
  for (var i=0; i<edges.length; i++) {
    var a = edges[i].a, b = edges[i].b;
    var idx_a, idx_b;
    for (var j=0; j<sets.length; j++) {
      if (a in sets[j]) idx_a = j;
      if (b in sets[j]) idx_b = j;
    }
    if (idx_a === idx_b) continue;
    mst.push(edges[i]);
    for (var key in sets[idx_b]) sets[idx_a][key] = true;
    sets[idx_b] = {};
  }
  return mst;
}
HitsRelationship = function(obj, other) {
  this.perceive(obj, other);
}
HitsRelationship.prototype.key = "hits";
HitsRelationship.prototype.targetType = 'obj';
HitsRelationship.prototype.arity = 2;
HitsRelationship.prototype.symmetric = false;
HitsRelationship.prototype.constant = true;

HitsRelationship.prototype.perceive = function(obj, other) {
  this.obj = obj;
  this.other = other;
  this.collisions = obj.object_node.scene_node.collisions.filter(
  	function (coll) { return coll.a === obj && coll.b === other }
  );
  // save the speed of the strongest collision in val
  this.val = this.collisions.length == 0 ? 0
             : d3.max(this.collisions, function (coll) { return coll.dv });
}

HitsRelationship.prototype.get_activity = function() {
  return this.val == 0 ? 0 : 1;
}

HitsRelationship.prototype.get_label = function() {
  return 'hits';
}
GetsHitRelationship = function(obj, other) {
  this.perceive(obj, other);
}
GetsHitRelationship.prototype.key = "gets_hit";
GetsHitRelationship.prototype.targetType = 'obj';
GetsHitRelationship.prototype.arity = 2;
GetsHitRelationship.prototype.symmetric = false;
GetsHitRelationship.prototype.constant = true;

GetsHitRelationship.prototype.perceive = function(obj, other) {
  this.obj = obj;
  this.other = other;
  this.collisions = obj.object_node.scene_node.collisions.filter(
  	function (coll) { return coll.b === obj && coll.a === other }
  );
  // save the speed of the strongest collision in val
  this.val = this.collisions.length == 0 ? 0
             : d3.max(this.collisions, function (coll) { return coll.dv });
}

GetsHitRelationship.prototype.get_activity = function() {
  return this.val == 0 ? 0 : 1;
}

GetsHitRelationship.prototype.get_label = function() {
  return 'gets-hit-by';
}
CollidesRelationship = function(obj, other) {
  this.perceive(obj, other);
}
CollidesRelationship.prototype.key = "collides";
CollidesRelationship.prototype.targetType = 'obj';
CollidesRelationship.prototype.arity = 2;
CollidesRelationship.prototype.symmetric = true;
CollidesRelationship.prototype.constant = true;

CollidesRelationship.prototype.perceive = function(obj, other) {
  this.obj = obj;
  this.other = other;
  this.collisions = obj.object_node.scene_node.collisions.filter(
  	function (coll) { return coll.a === obj && coll.b === other ||
                             coll.b === obj && coll.a === other }
  );
  // save the speed of the strongest collision in val
  this.val = this.collisions.length == 0 ? 0
             : d3.max(this.collisions, function (coll) { return coll.dv });
}

CollidesRelationship.prototype.get_activity = function() {
  return this.val == 0 ? 0 : 1;
}

CollidesRelationship.prototype.get_label = function() {
  return 'collides-with';
}
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
    var B_stable = B.getAttr('stable').get_activity() >= 0.5;
    if (B_stable) {
      var B_stable_without_A = oracle.analyzeFuture(0, before, function() {
        var stable_attr = new StableAttribute(B.obj);
        return stable_attr.get_activity() >= 0.5;
      });
      if (!B_stable_without_A) return 'stabilizes';
    }
  }

  return 'not';
}
/// Group attribute, number of objects in the group.
CountAttribute = function(group) {
  this.perceive(group);
}
CountAttribute.prototype.key = "count";
CountAttribute.prototype.targetType = 'group';
CountAttribute.prototype.arity = 1;
CountAttribute.prototype.constant = true;

CountAttribute.prototype.perceive = function(group) {
  this.group = group;
  this.val = group.objs.length;
}

CountAttribute.prototype.get_activity = function() {
  return 1;
}

CountAttribute.prototype.get_label = function() {
	if (this.val < 4) return this.val;
	return ">=4";
}
/// Group attribute. A group is touching if all objects in the group are connected
/// to each other by a sequence of touching objects. Groups with 1 or 0 objects are
/// not touching.
TouchAttribute = function(group) {
  this.perceive(group);
}
TouchAttribute.prototype.key = "touching";
TouchAttribute.prototype.targetType = 'group';
TouchAttribute.prototype.arity = 1;
TouchAttribute.prototype.constant = false;

TouchAttribute.prototype.perceive = function(group) {
  this.group = group;
  if (group.objs.length < 2) this.val = 100;
  else {
    var nodes = [];
    for (var i=0; i<group.objs.length; i++) { nodes.push(i) }
    var edges = [], scale = group.objs[0].phys_scale;
    for (var i=1; i<group.objs.length; i++) for (var j=0; j<i; j++) {
      edges.push({a:i, b:j, dist: group.objs[i].phys_obj.distance(group.objs[j].phys_obj) / scale});
    };
    var mst = CloseAttribute.getMST(nodes, edges);
    // the last edge in the MST has the bigges distance
    this.val = mst[mst.length-1].dist;
  }
}

TouchAttribute.prototype.get_activity = function() {
  return (isNaN(this.val) ? 0 : TouchRelationship.membership(this.val));
}

TouchAttribute.prototype.get_label = function() {
  return 'touching';
}
var pbpSettings = (function() {
	res = {
    max_dist: 0.06 // maximal distance of an objects to a spatial group to belong to it
   ,activation_threshold: 0.5
   ,obj_attrs: {}
   ,obj_rels: {}
   ,group_attrs: {}
	};
	// object attributes
	[LeftAttribute,
	 LeftMostAttribute,
	 RightAttribute,
	 RightMostAttribute,
	 BottomAttribute,
	 TopAttribute,
	 TopMostAttribute,
	 SingleAttribute,
	 OnGroundAttribute,
	 CircleAttribute,
	 SquareAttribute,
	 RectangleAttribute,
	 TriangleAttribute,
	 ShapeAttribute,
	 StableAttribute,
	 UnstableAttribute,
	 SmallAttribute,
	 LargeAttribute,
	 MovesAttribute,
	 MovableUpAttribute].forEach(function (attr) { res.obj_attrs[attr.prototype.key] = attr });
	// group attributes
	[CloseAttribute,
	 CountAttribute,
	 FarAttribute,
	 TouchAttribute
	].forEach(function (attr) { res.group_attrs[attr.prototype.key] = attr });
	// object relations
	[AboveRelationship,
	BelowRelationship,
	LeftRelationship,
	RightRelationship,
	BesideRelationship,
	FarRelationship,
	CloseRelationship,
	OnTopRelationship,
	TouchRelationship,
	HitsRelationship,
	GetsHitRelationship,
	CollidesRelationship,
	SupportsRelationship].forEach(function (rel) { res.obj_rels[rel.prototype.key] = rel });
	return res;
})();

var PBP = PBP || {};

/// Adds all keys+values in b to a (overwrites if exists) and returns a. If b is not an object, just
/// return a.
PBP.extend = function(a, b) {
  if (typeof(b) === 'object') for (var key in b) a[key] = b[key];
  return a;
}
// events in DOM2 have the properties cancelable and bubble
// they are created with createEvent and initialized with initEvent, then sent with dispatchEvent
// I won't use the DOM2 event engine for now, but might do so later when I need more powerful
// features than right now

/// Mixin-Pattern as described on
/// http://javascriptweblog.wordpress.com/2011/05/31/a-fresh-look-at-javascript-mixins/
/// Usage: asEventListner.call(MyClass.prototype);
var asEventListener = function() {
  // Adds the passed listener for events of passed type (a string). Won't add the same listner twice.
  this.addEventListener = function(type, listener) {
    var key = '__on' + type;
    if (!this[key]) this[key] = [];
    // don't register the same listener twice
    if (this[key].indexOf(listener) != -1) return;
    this[key].push(listener);
  }
  this.on = this.addEventListener;

  // Removes the passed listener from the passed event type (a string). Don't pass a
  // specific listener to remove all listeners of that type of event.
  this.removeEventListener = function(type, listener) {
    var key = '__on' + type;
    if (!this[key]) return;
    if (!listener) this[key].length = 0;
    else {
      var idx = this[key].indexOf(listener);
      if (idx !== -1) this[key].splice(idx, 1);
    }
  }
  this.off = this.removeEventListener;

  // Dispatches an event. The event is optional.
  this.dispatchEvent = function(type, event) {
    var key = '__on' + type;
    if (!this[key]) return;
    for (var i=0; i<this[key].length; i++) this[key][i](event);
  }

  return this;
};
/// Copyright by Erik Weitnauer, 2012.

/// An ObjectNode represents a single object. Pass the object (shape) it represents
/// and the SceneNode it is part of.
ObjectNode = function(scene_node, obj) {
	this.obj = obj; obj.object_node = this;
  this.scene_node = scene_node;
	this.times = {};
  this.selectors = []; // selectors that match this object
}

/// list of all possible object attributes
ObjectNode.attrs = pbpSettings.obj_attrs;

/// list of all possible object relations
ObjectNode.rels = pbpSettings.obj_rels;

/// The ObjectNode will send 'perceived' and 'retrieved' events
/// {percept, target, other, time}.
ObjectNode.events = d3.dispatch('perceived', 'retrieved');

/// Returns true if there is the passed relation type with the passed activity
/// with the passed other object node.
ObjectNode.prototype.hasRelation = function(key, time, active, other) {
  if (!(time in this.times)) return false;
  if (!(key in ObjectNode.rels) || !(key in this.times[time])) return false;
  return this.times[time][key].some((function(rel) {
    return rel.other === other.obj && (rel.get_activity() >= pbpSettings.activation_threshold) == active;
  }).bind(this));
};

/// Perceives all object attributes and all relations to all other objects
/// in the scene at the current situation and saves the results under the
/// passed time.
ObjectNode.prototype.perceive = function(time) {
  var res = {};
  for (var a in ObjectNode.attrs) {
    var attr = ObjectNode.attrs[a];
    res[a] = new attr(this.obj, this.scene_node);
  }
  for (var r in ObjectNode.rels) {
    var rel = ObjectNode.rels[r];
    res[r] = [];
    var objs = this.scene_node.objs;
    for (var i=0; i<objs.length; i++) {
      if (objs[i] == this) continue;
      if (typeof(GroupNode) != 'undefined' && objs[i] instanceof GroupNode) {
        if (rel.ObjectToGroup) res[r].push(rel.ObjectToGroup(this.obj, objs[i].objs, this.scene_node));
      } else if (objs[i] instanceof ObjectNode) {
        res[r].push(new rel(this.obj, objs[i].obj, this.scene_node));
      }
    }
    if (res[r].length == 0) delete res[r];
  }
  this.times[time] = res;
}

/// Dynamically retrieves and caches an attribute or feature. Optionally pass the time
/// as `time` field in the `opts` object. When getting a relationship feature, pass the
/// other ObjectNode as `other` field in `opts`.
/// To just get a perception from the cache and return false if its not there, put
/// `cache_only: true` in the `opts`.
ObjectNode.prototype.get = function(key, opts) {
  if (key in ObjectNode.attrs) return this.getAttr(key, opts);
  else if (key in ObjectNode.rels) return this.getRel(key, opts);
  else throw "unknown feature '" + key + "'";
}

/// Only return cached perceptions that are marked as deliberate.
ObjectNode.prototype.getDeliberateOnly = function(key, opts) {
  opts = opts || {};
  opts.deliberate_only = true;
  return this.get(key, opts);
}

/// Only return cached perceptions that are marked as deliberate.
ObjectNode.prototype.getDeliberately = function(key, opts) {
  opts = opts || {};
  opts.set_deliberate = true;
  return this.get(key, opts);
}

/// Returns the attribute named `key`. If given, the `time` in the `opts` object is used,
/// otherwise the current state of the oracle is used. If the oracle is in no named state,
/// the perceived attribute is not cached, otherwise its returned if in cache or perceived,
/// cached and returned if not in cache.
/// Results will not be cached if 'dont_cache' is ture in opts.
ObjectNode.prototype.getAttr = function(key, opts) {
  var o = PBP.extend({}, opts);
  // if time was not passed, use the current state of the oracle
  if (!o.time) o.time = this.scene_node.oracle.curr_state;
  if (ObjectNode.attrs[key].constant) o.time = 'start';
  // if the attr is cached, just return it
  if ((o.time in this.times) && (key in this.times[o.time])) {
    var res = this.times[o.time][key];
    if (o.deliberate_only && !res.deliberate) return false;
    if (o.set_deliberate) res.deliberate = true;
    ObjectNode.events.retrieved({ percept: res, target: this, time: o.time
                                , deliberate: o.set_deliberate
                                , only_checking : o.deliberate_only || o.cache_only });
    return res;
  }
  if (o.cache_only || o.deliberate_only) return false;
  // otherwise, goto the state and perceive it
  if (o.time) this.scene_node.oracle.gotoState(o.time);
  var res = new ObjectNode.attrs[key](this.obj);
  // cache it, if the state is a known one
  if (o.time && !o.dont_cache) {
    if (!this.times[o.time]) this.times[o.time] = {};
    this.times[o.time][key] = res;
    ActivityRanges.update(res, o.time);
  }
  if (o.set_deliberate) res.deliberate = true;
  ObjectNode.events.perceived({percept: res, target: this, time: o.time
                              , deliberate: o.set_deliberate});
  return res;
}

/// Returns the relationship named `key` with the `other` object node in the `opts` object.
/// If given, the `time` in the `opts` object is used,
/// otherwise the current state of the oracle is used. If the oracle is in no named state,
/// the perceived relationship is not cached, otherwise its returned if in cache or perceived,
/// cached and returned if not in cache.
/// If opts.get_all is set, the method will return an array of all relationships
/// that were perceived for the object so far. Use only in combination with opts.cache_only!
/// Results will not be cached if 'dont_cache' is ture in opts.
ObjectNode.prototype.getRel = function(key, opts) {
  var o = PBP.extend({}, opts);
  // if time was not passed, use the current state of the oracle
  if (!o.time) o.time = this.scene_node.oracle.curr_state;
  if (ObjectNode.rels[key].constant) o.time = 'start';
  // if the rel is cached, return it
  if ((o.time in this.times) && (key in this.times[o.time])) {
    var cache = this.times[o.time][key];
    if (o.get_all) return (o.deliberate_only
                          ? cache.filter(function(perc) { return perc.deliberate; })
                          : cache);
    var res = cache.filter(function (rel) { return rel.other === o.other.obj })[0];
    if (res) {
      if (o.deliberate_only && !res.deliberate) return false;
      if (o.set_deliberate) res.deliberate = true;
      ObjectNode.events.retrieved({ percept: res, target: this, time: o.time
                                  , deliberate: o.set_deliberate, other: o.other
                                  , only_checking : o.deliberate_only || o.cache_only });
      return res;
    }
  }
  if (o.cache_only || o.deliberate_only) return o.get_all ? [] : false;
  // otherwise, goto the state and perceive it
  if (o.time) this.scene_node.oracle.gotoState(o.time);
  var res = new ObjectNode.rels[key](this.obj, o.other.obj);
  // cache it, if the state is a known one
  if (o.time && !o.dont_cache) {
    if (!this.times[o.time]) this.times[o.time] = {};
    if (!this.times[o.time][key]) this.times[o.time][key] = [];
    this.times[o.time][key].push(res);
    ActivityRanges.update(res, o.time);
  }
  if (o.set_deliberate) res.deliberate = true;
  ObjectNode.events.perceived({ percept: res, target: this, time: o.time
                              , deliberate: o.set_deliberate, other: o.other});
  return res;
}

/// Returns a human readable description of the active attribute and relationship labels for
/// each object at each of the recorded times. If there are two times, 'start' and 'end', values
/// that don't change are summarized and shown first.
ObjectNode.prototype.describe = function(prefix) {
  prefix = prefix || '';
  var res = [prefix + 'Obj. ' + this.obj.id + ':'];
  var times = d3.keys(this.times);
  // special handling when just start and end time are known
  // if (times.length == 2 && times.indexOf('start') != -1 && times.indexOf('end') != -1) {
  //   var both=[], start=[], end=[];
  //   for (var a in ObjectNode.attrs) {
  //     var attr0 = this.times.start[a], attr1 = this.times.end[a];
  //     if (!attr0 || !attr1) continue;
  //     var vals = [(attr0.get_activity() >= 0.5) ? attr0.get_label() : '',
  //                 (attr1.get_activity() >= 0.5) ? attr1.get_label() : ''];
  //     if (vals[0] == '' && vals[1] == '') continue;
  //     if (vals[0] == '') end.push(vals[1])
  //     else if (vals[1] == '') start.push(vals[0])
  //     else if (vals[0] == vals[1]) both.push(vals[0]);
  //     else both.push(vals[0] + "==>" + vals[1]);
  //   }
  //   for (var r in ObjectNode.rels) {
  //     var rels0 = this.times.start[r], rels1 = this.times.end[r];
  //     if (!rels0 || !rels1) continue;
  //     for (var i=0; i<rels0.length; i++) {
  //       if (!rels0[i] || !rels1[i]) continue;
  //       var vals = [(rels0[i].get_activity() >= 0.5) ? rels0[i].get_label() : '',
  //                   (rels1[i].get_activity() >= 0.5) ? rels1[i].get_label() : '']
  //       if (vals[0] == '' && vals[1] == '') continue;
  //       if (vals[0] == '') end.push(vals[1] + ' ' + rels1[i].other.id)
  //       else if (vals[1] == '') start.push(vals[0] + ' ' + rels0[i].other.id)
  //       else if (vals[0] == vals[1]) both.push(vals[0] + ' ' + rels0[i].other.id);
  //       else both.push(vals[0] + "==>" + vals[1] + ' ' + rels0[i].other.id);
  //     }
  //   }
  //   res.push(prefix + '  ' + both.join(', ') + ' START: ' + start.join(', ') + ' END: ' + end.join(', '));
  // } else {
    for (var time in this.times) res.push(prefix + this.describeState(time, '  '));
//  }
  return res.join("\n");
}

/// Returns a human readable description of the passed time (see the `describe` method).
ObjectNode.prototype.describeState = function(time, prefix) {
  prefix = prefix || '';
  var out = [];
  for (var a in ObjectNode.attrs) {
    var attr = this.times[time][a];
    if (!attr) continue;
    var res = attr.get_label() + '[' + attr.get_activity().toFixed(2) + ']';
    out.push(attr.deliberate ? res.toUpperCase() : res);
  }
  for (var r in ObjectNode.rels) {
    var rels = this.times[time][r];
    if (!rels) continue;
    for (var i=0; i<rels.length; i++) {
      if (!rels[i]) continue;
      var res = rels[i].get_label() + '#' + rels[i].other.id + '[' + rels[i].get_activity().toFixed(2) + ']';
      out.push(rels[i].deliberate ? res.toUpperCase() : res);
    }
  }
  return prefix + time + ": " + out.join(', ');
};
/// Copyright by Erik Weitnauer, 2013.

/// A GroupNode represents a group of objects in one scene. Pass the SceneNode the
/// group belongs to. Optionally, pass an selector array that was used to create the
/// group node.
GroupNode = function(scene_node, objs, selectors) {
  this.scene_node = scene_node;
  this.objs = objs || [];   // shapes
  this.id =(''+Math.random()).substr(2,5);
  this.times = {};
  // selectors that select this group node:
  this.selectors = selectors ? (Array.isArray(selectors) ? selectors.slice()
                                                         : [selectors])
                             : [new Selector()];
}

/// The GroupNode will send 'perceived' and 'retrieved' events
/// {percept, target, other, time}.
GroupNode.events = d3.dispatch('perceived', 'retrieved');

GroupNode.prototype.empty = function() {
  return this.objs.length === 0;
}

GroupNode.prototype.addSelector = function(new_sel) {
  if (this.selectors.some(function(sel) { return new_sel.equals(sel) })) {
    var dublicate = this.selectors.filter(function(sel) { return new_sel.equals(sel) })[0];
    console.error("Inserting duplicate selector, this should not happen.");
    console.info("New selector: '" + new_sel.describe() + "' from solution ", new_sel.solution.describe());
    console.info("Old selector: '" + dublicate.describe() + "' from solution", dublicate.solution.describe());
  }
  this.selectors.push(new_sel);
};

/// Returns a clone with the same scene node, a copy of the objs array.
/// CAUTION: The times field that holds all cached percepts is the same
/// reference as in the original group node!
GroupNode.prototype.clone = function() {
  var gn = new GroupNode(this.scene_node, this.objs.slice(), this.selectors);
  gn.times = this.times;
  return gn;
}

/// Creates and returns a single GroupNode of all objects of a scene. If a blank selector
/// is passed, it is used as selector for the new group node.
GroupNode.sceneGroup = function(scene_node, sel) {
  if (!sel.blank()) throw "Selector must be blank, but is " + sel.describe() + "!";
  var objs = scene_node.objs.map(function(on) { return on.obj});
	return new GroupNode(scene_node, objs, sel);
}

/// Creates a GroupNodes for each set of spatially close objects in the scene
/// that has more than one object.
GroupNode.spatialGroups = function(scene_node, max_dist) {
  var gns = [];
  if (typeof(max_dist) === 'undefined') max_dist = 0.06;
  var sg = scene_node.oracle.getSpatialGroups(max_dist);
  for (var i=0; i<sg.length; i++) {
    if (sg[i].length > 0) gns.push(new GroupNode(scene_node, sg[i].map(function (body) { return body.master_obj.obj })))
  }
  return gns;
}

/// list of all possible group attributes
GroupNode.attrs = pbpSettings.group_attrs;

/// Perceives all attributes and all relations to all other objs in the scene
/// at the current situation and saves the results under the passed time.
GroupNode.prototype.perceive = function(time) {
  var res = {};
  for (var a in GroupNode.attrs) {
    var attr = GroupNode.attrs[a];
    res[a] = new attr(this);
  }
  this.times[time] = res;
}

/// Returns the attribute for the passed time in the opts object (default is 'start').
/// If it was not perceived yet, it is perceived now, unless 'cache_only' is true in opts.
/// Results will not be cached if 'dont_cache' is ture in opts.
GroupNode.prototype.getAttr = function(key, opts) {
  var o = PBP.extend({}, opts);
  // if time was not passed, use the current state of the oracle
  if (!o.time) o.time = this.scene_node.oracle.curr_state;
  if (GroupNode.attrs[key].constant) o.time = 'start';
  // if the attr is cached, just return it
  if ((o.time in this.times) && (key in this.times[o.time])) {
    var res = this.times[o.time][key];
    if (o.deliberate_only && !res.deliberate) return false;
    if (o.set_deliberate) res.deliberate = true;
    GroupNode.events.retrieved({ percept: res, target: this, time: o.time
                               , deliberate: o.set_deliberate });
    return res;
  }
  if (o.cache_only || o.deliberate_only) return false;
  // otherwise, goto the state and perceive it
  if (o.time) this.scene_node.oracle.gotoState(o.time);
  var res = new GroupNode.attrs[key](this);
  // cache it, if the state is a known one
  if (o.time && !o.dont_cache) {
    if (!this.times[o.time]) this.times[o.time] = {};
    this.times[o.time][key] = res;
    ActivityRanges.update(res, o.time);
  }
  if (o.set_deliberate) res.deliberate = true;
  GroupNode.events.perceived({ percept: res, target: this, time: o.time
                             , deliberate: o.set_deliberate
                             , only_checking : o.deliberate_only || o.cache_only });
  return res;
}

GroupNode.prototype.getDeliberately = function(key, opts) {
  opts = opts || {};
  opts.set_deliberate = true;
  return this.getAttr(key, opts);
}

GroupNode.prototype.getDeliberateOnly = function(key, opts) {
  opts = opts || {};
  opts.deliberate_only = true;
  return this.getAttr(key, opts);
}

GroupNode.prototype.get = GroupNode.prototype.getAttr;

/// Prints a description of the GroupNode.
GroupNode.prototype.describe = function() {
  console.log(this);
}
// Copyright 2014, Erik Weitnauer.

/** The Selector is used to focus on a subset of objects in a scene based on
 * a number of attributes and relations that must be fullfilled.
 * The selector can either have group or object attributes & relationships.
 * For obj. attrs, select() collects all matching objects inside a new group.
 * For group attrs, select() will return the whole group if it matches or
 * an empty group if it does not match.
 * The selector can be in unique mode, which means that result groups with more
 * than one element are returned as empty groups instead.
 *
 * The perceptions done during the application of the selector will not be
 * cached. */

 // FIXME: unique is not doing what is described above. Instead, it is only
 // used in the RelMatcher to decide whether to match all or exactly one of the
 // things we relate to.
var Selector = function(unique) {
	this.obj_attrs = [];	  // object attributes
	this.grp_attrs = [];	  // group attributes
	this.rels = [];         // object relationships
	this.unique = !!unique;
	this.solution = null;   // the solution associated with this selector
  this.is_reference_selector = false; // set to true if this is an other_sel in a rel-matcher
                                      // in that case, we don't add this selector to the group
                                      // selector array after matching, to avoid duplicates

	this.thresholds = { /*'unstable.object': 0.3*/ };   // can be used to map features (e.g. 'close.object') to custom thresholds

	this.cached_results = []; // array of groups that are resulted from applying this selector
	this.merged_with = []; // list of other selectors that were already merged with this one
	this.cached_complexity = null;
}

/// Can be 'object', 'group' or 'mixed'. A blank selector is of 'object' type.
Selector.prototype.getType = function() {
	if (this.blank()) return 'object';
	if (this.grp_attrs.length === 0) return 'object';
	if (this.obj_attrs.length === 0 && this.rels.length === 0) return 'group';
	return 'mixed';
}

Selector.prototype.getComplexity = function() {
	if (this.cached_complexity === null) {
		var c = 0;
		for (var i=0; i<this.obj_attrs.length; i++) {
		  c += this.obj_attrs[i].getComplexity();
		}
		for (var i=0; i<this.grp_attrs.length; i++) {
		  c += this.grp_attrs[i].getComplexity();
		}
		for (var i=0; i<this.rels.length; i++) {
		  c += this.rels[i].getComplexity();
		}
		if (this.blank()) c = 1;
		var neg_count = this.countNegations();
		if (neg_count > 0) c += Math.pow(2, neg_count);
		this.cached_complexity = c;
	}
	return this.cached_complexity + (this.solution.mode === 'unique' ? -1 : 0);
}

/// Returns true if the selector has no matchers and will therefore match anything.
Selector.prototype.blank = function() {
	return (this.obj_attrs.length === 0
	     && this.grp_attrs.length === 0
	     && this.rels.length === 0)
}

/// Returns true if the selector only has base-level features.
Selector.prototype.base_level_only = function() {
	if (this.grp_attrs.length > 0 || this.rels.length > 0) return false;
	return this.obj_attrs.every(function(attr) { return attr.base_level && attr.active });
}

Selector.prototype.hasRelationships = function() {
	return this.rels.length > 0;
}

Selector.prototype.hasAttr = function(key) {
	return ( this.obj_attrs.some(function(attr) { return attr.key === key })
		    || this.grp_attrs.some(function(attr) { return attr.key === key }));
}

Selector.prototype.hasRel = function(key) {
	return this.rels.some(function(rel) { return rel.key === key });
}

Selector.prototype.featureCount = function() {
	return this.obj_attrs.length + this.grp_attrs.length + this.rels.length;
}

/// Calls the passed function once for each feature that is part of the
/// selector.
Selector.prototype.forEachFeature = function(fn) {
	var i;
	for (i=0; i<this.obj_attrs.length; i++)
		fn(pbpSettings.obj_attrs[this.obj_attrs[i].key]);
	for (i=0; i<this.grp_attrs.length; i++)
		fn(pbpSettings.group_attrs[this.grp_attrs[i].key]);
	for (i=0; i<this.rels.length; i++) {
		fn(pbpSettings.obj_rels[this.rels[i].key]);
		this.rels[i].other_sel.forEachFeature(fn);
	}
}

Selector.prototype.forEachMatcher = function(fn) {
	var i;
	for (i=0; i<this.obj_attrs.length; i++) fn(this.obj_attrs[i]);
	for (i=0; i<this.grp_attrs.length; i++) fn(this.grp_attrs[i]);
	for (i=0; i<this.rels.length; i++) fn(this.rels[i]);
}

Selector.prototype.countNegations = function() {
	var c = 0;
	this.forEachMatcher(function(m) { c += m.countNegations() });
	return c;
}

/** Returns the first group in the passed scene that contains this selector in
 * its selectors array. Null if none. */
Selector.prototype.getCachedResult = function(scene) {
	for (var i=0; i<this.cached_results.length; i++) {
		var g = this.cached_results[i];
		if (g.scene_node === scene) return g;
	}
	return null;
}

/// Clones all matchers, the solution reference, and cached results.
Selector.prototype.clone = function() {
	var sel = new Selector(this.unique);
	sel.solution = this.solution;
  sel.is_reference_selector = this.is_reference_selector;
	var add_attr = function(attr) { sel.add_attr(attr.clone()) };
	var add_rel = function(rel) { sel.add_rel(rel.clone()) };
	this.obj_attrs.forEach(add_attr);
	this.grp_attrs.forEach(add_attr);
	this.rels.forEach(add_rel);
	//sel.cached_results = this.cached_results.slice();
	//sel.cached_complexity = this.cached_complexity;
	return sel;
}

/** Will return a cached result if it exists. If not, it will apply the selector
 * to the scene. If there is a group in the scene that contains the same objects
 * as selected by this selector, it will return that group, otherwise the newly
 * created group, after adding it to the scene.
 * It the passed selector is a reference selector, it will not do any caching or
 * adding to the selector arrays. */
Selector.prototype.applyToScene = function(scene, no_caching) {
  var group = no_caching ? null : this.getCachedResult(scene);
  if (group) return group;
  group = this.selectFromAll(scene);
  if (no_caching) return group;
  this.cached_results.push(group);
  if (this.is_reference_selector) return group;
  if (group.empty()) return group;
  if (scene.groups.indexOf(group) === -1) scene.groups.push(group);
  if (group.selectors.indexOf(this) === -1) group.addSelector(this);
  return group;
}

Selector.prototype.hasFeatureType = function(klass) {
	var res = false;
	this.forEachFeature(function(f) {
		if (f.prototype === klass) res = true
	});
	return res;
}

/** Returns a new selector that has all attributes from this and the passed selector.
 * In the case of a duplicate feature, the feature of the passed selector is used. */
Selector.prototype.mergedWith = function(other_sel) {
	var sel = new Selector();
	var add_attr = function(attr) { sel.add_attr(attr) };
	var add_rel = function(rel) { sel.add_rel(rel) };

	this.obj_attrs.forEach(add_attr);
	other_sel.obj_attrs.forEach(add_attr);
	this.grp_attrs.forEach(add_attr);
	other_sel.grp_attrs.forEach(add_attr);
	this.rels.forEach(add_rel);
	other_sel.rels.forEach(add_rel);

	return sel;
}

/// Will extract the attribute's key, label, activation and constant property. Pass the time
/// at which the attribute values should match (default: 'start').
Selector.prototype.use_attr = function(attr, time) {
	this.add_attr(Selector.AttrMatcher.fromAttribute(attr, time));
	return this;
};

/// Adds the passed AttrMatcher. Will replace if an attr with the same key and
/// time is in the list already.
Selector.prototype.add_attr = function(attr_matcher) {
	var attrs = (attr_matcher.type === 'group') ? this.grp_attrs : this.obj_attrs;
	// if we have an attr of same type, replace
	for (var i=0; i<attrs.length; i++) {
		var attr = attrs[i];
	  if (attr.key === attr_matcher.key
	     && attr.time === attr_matcher.time
	  	 && attr.type === attr.type) {
	  	attrs[i] = attr_matcher;
	  	return this;
	  }
	}
	// its new, add to list
	attrs.push(attr_matcher);
	return this;
};

/// Will extract the relation key, label, activation, constant and symmetry properties. Pass the time
/// at which the attribute values should match (default: 'start'). Pass a selector that selects the other
/// object.
Selector.prototype.use_rel = function(other_sel, rel, time) {
	this.add_rel(Selector.RelMatcher.fromRelationship(other_sel, rel, time));
	return this;
};

/// Adds the passed RelMatcher. Will replace if a rel with the same key, target object
/// and time is in the list already.
Selector.prototype.add_rel = function(rel_matcher) {
  rel_matcher.other_sel.is_reference_selector = true;
	// if we have an attr of same type, replace
	for (var i=0; i<this.rels.length; i++) {
		var rel = this.rels[i];
	  if (rel.key === rel_matcher.key && rel.time == rel_matcher.time &&
	  	  rel.other_sel.equals(rel_matcher.other_sel)) {
	  	this.rels[i] = rel_matcher;
	  	return this;
	  }
	}
	// its new, add to list
	this.rels.push(rel_matcher);
	return this;
};

/// Returns true if the passed other selector has the same relationships and attributes.
/// They might be in a different order.
/// We consider two otherwise identical selectors with different thresholds as equal. This
/// is useful since it avoids duplicate selectors when changing the thresholds.
Selector.prototype.equals = function(other) {
	if (!other) return false;
	if (this === other) return true;
	if (this.obj_attrs.length !== other.obj_attrs.length) return false;
	if (this.grp_attrs.length !== other.grp_attrs.length) return false;
	if (this.rels.length !== other.rels.length) return false;
	var self = this;
	var differs = function(field) {
		return (!self[field].every(function (ours) {
			return other[field].some(function (theirs) {
		  	return ours.equals(theirs)
			})
		}))
	}
	if (differs('grp_attrs') || differs('obj_attrs') || differs('rels')) return false;
	return true;
}

/// Returns true if the passed object node matches the selector's object
/// attributes and relations. Optionally, an array of nodes that will be
/// condisered as relationship partners can be passed as second parameter. If
/// it isn't, all objects in the scene except `object` are used. If a test_fn
/// is passed, it is called for each node that matches the selector attributes
/// and only if the function returns true, the node is used. The relationships
/// of the selector are not used in this case.
Selector.prototype.matchesObject = function(object, others, test_fn) {
	var self = this;
	return this.obj_attrs.every(function (attr) {
		return attr.matches(object, self.thresholds[attr.key+'.object'])
	}) &&
    (test_fn ? test_fn(object) : this.rels.every(function (rel) {
    return rel.matches(object, others, self.thresholds[rel.key+'.object'])
  }));
};

/// Returns true if the passed group node matches the selector's group attributes.
Selector.prototype.matchesGroup = function(group) {
	var self = this;
	return this.grp_attrs.every(function (attr) {
	  return attr.matches(group, self.thresholds[attr.key+'.group'])
	});
};

/// Applies the selector to all elements in the scene.
Selector.prototype.selectFromAll = function(scene) {
	var all_group = scene.groups[0] || GroupNode.sceneGroup(scene, this);
  if (all_group.objs.length !== scene.objs.length) throw "1st group in each scene should be the all-group";
  if (this.blank()) return all_group;
  var type = this.getType();
  var self = this;
  var gn = all_group;
  if (type === 'mixed' || type === 'object') {
    var nodes = gn.objs
      .map(function (obj) { return obj.object_node })
      .filter(function (node) { return self.matchesObject(node) })
      .map(function (on) { return on.obj });

    if (nodes.length === 0) return new GroupNode(scene, [], this);

    // check whether a group with these nodes already exists in the scene
    gn = scene.getGroupByNodes(nodes) || new GroupNode(scene, nodes, this);
  }
  // then apply group-level features
  if (type === 'mixed' || type === 'group') {
    if (!this.matchesGroup(gn)) gn = new GroupNode(scene, [], this);
  }
  return gn;
}

/// Returns a human readable description of the attributes used in this selector.
Selector.prototype.describe = function() {
	var threshs = this.thresholds;
	var descr = function(feature) { return feature.describe(threshs[feature.key+'.'+feature.type]) }

	if (this.blank()) return (this.unique ? '[the object]' : '(any object)');
	var attrs = this.obj_attrs.map(descr).join(" and ");
	var grp_attrs = this.grp_attrs.map(descr);
	var rels = this.rels.map(descr);
	rels = rels.concat(grp_attrs).join(" and ");

	if (this.unique) return '[the ' + attrs + ' object' + (rels === '' ? '' : ' that is ' + rels) + ']';
	return '(' + attrs + ' objects' + (rels === '' ? '' : ' that are ' + rels) + ')';
};

Selector.AttrMatcher = function(key, label, active, time, type) {
	this.key = key;
	this.label = label;
	this.active = typeof(active) === 'undefined' ? true : active;
	if (key in pbpSettings.obj_attrs) {
		this.type = "object";
		this.constant = pbpSettings.obj_attrs[key].prototype.constant;
		this.base_level = pbpSettings.obj_attrs[key].prototype.base_level;
	} else {
		this.type = "group";
		this.constant = pbpSettings.group_attrs[key].prototype.constant;
		this.base_level = pbpSettings.group_attrs[key].prototype.base_level;
	}
	this.time = time || 'start';
}

Selector.AttrMatcher.prototype.clone = function() {
	return new Selector.AttrMatcher( this.key, this.label, this.active
		                             , this.time, this.type);
}

/// Will extract the attribute's key, label, activation and constant property. Pass the time
/// at which the attribute values should match (default: 'start').
Selector.AttrMatcher.fromAttribute = function(attr, time) {
	return new Selector.AttrMatcher(
		attr.key, attr.get_label()
	 ,attr.get_activity() >= pbpSettings.activation_threshold
	 ,time);
}

Selector.AttrMatcher.prototype.getComplexity = function() {
	var c = this.base_level ? 0.5 : 1;
	if (this.time !== 'start') c++;
	return c;
}

Selector.AttrMatcher.prototype.countNegations = function() {
	return this.active ? 0 : 1;
}

/// Returns true if the other AttrMatcher is the same as this one.
Selector.AttrMatcher.prototype.equals = function(other) {
	return (this.key === other.key && this.label === other.label &&
	        this.active === other.active && this.time === other.time);
}

/// Returns true if the passed node can supply the attribute and its activation and
/// label match.
Selector.AttrMatcher.prototype.matches = function(node, threshold) {
	var attr = node.getAttr(this.key, {time: this.time});
	if (!attr) return false;
	//console.log(this.key,'has activity',attr.get_activity());
	var active = attr.get_activity() >= (threshold || pbpSettings.activation_threshold);
	return (active == this.active && attr.get_label() == this.label);
}

Selector.AttrMatcher.prototype.describe = function(threshold) {
	return (this.active ? '' : 'not ') + this.label +
				 (threshold ? '['+threshold.toFixed(2)+']' : '') +
				 (this.constant || this.time == "start" ? '' : ' at the ' + this.time);
}

/// CAUTION: other_sel is not allowed to use RelMatchers, itself! Otherwise
/// we could get into infinite recursion!
Selector.RelMatcher = function(other_sel, key, label, active, time) {
	this.other_sel = other_sel;
	this.key = key;
	this.label = label;
	this.type = 'object';
	this.active = typeof(active) === 'undefined' ? true : active;
	this.constant = pbpSettings.obj_rels[key].prototype.constant;
	this.symmetric = pbpSettings.obj_rels[key].prototype.symmetric;
	this.time = time || 'start';
}

Selector.RelMatcher.prototype.clone = function() {
	return new Selector.RelMatcher( this.other_sel, this.key, this.label
		                            , this.active, this.time);
}

Selector.RelMatcher.prototype.getComplexity = function() {
	var c = 1;
	if (this.time !== 'start') c++;
	c += this.other_sel.getComplexity();
	return c;
}

Selector.RelMatcher.prototype.countNegations = function() {
	return (this.active ? 0 : 1) + this.other_sel.countNegations();
}

/// Returns true if the other RelMatcher is the same as this one.
Selector.RelMatcher.prototype.equals = function(other) {
	return (this.key === other.key && this.label === other.label &&
	        this.active === other.active && this.time === other.time &&
	        this.other_sel.equals(other.other_sel));
}

/// First uses its 'other' selector on the passed 'others' array of nodes. Returns true
/// if the passed 'node' can supply the relationship to any of the selected nodes and
/// the activation and label match.
/// If others is not passed, all nodes in the scene except the 'node' are used.
Selector.RelMatcher.prototype.matches = function(node, others, threshold) {
	if (this.other_sel.rels.length > 0) throw "the other-selector of"
	// select all other nodes in the scene as 'others', if they were not passed
	others = others || node.scene_node.objs.filter(function (on) { return on !== node });

	var self = this;

	var test_fn = function(other) {
		if (other === node) return false;
		var rel = node.getRel(self.key, {other: other, time: self.time});
		if (!rel) return false;
	  var active = rel.get_activity() >= (threshold || pbpSettings.activation_threshold);
		return (active == self.active && rel.get_label() == self.label);
	}

	var match_fn = function(other) {
		return self.other_sel.matchesObject(other, null, test_fn);
	}

	var matching_others = others.filter(match_fn);

	if (!this.active) return matching_others.length === others.length;
	if (this.other_sel.unique && matching_others.length != 1) return false;
	return matching_others.length > 0;
}

/// Will extract the relation key, label, activation, constant and symmetry properties. Pass the time
/// at which the attribute values should match (default: 'start'). Pass a selector that selects the other
/// object.
Selector.RelMatcher.fromRelationship = function(other, rel, time) {
	return new Selector.RelMatcher(
		other, rel.key, rel.get_label()
	 ,rel.get_activity() >= pbpSettings.activation_threshold
	 ,time);
}

Selector.RelMatcher.prototype.describe = function(threshold) {
	return (this.active ? '' : 'not ') + this.label +
				 (threshold ? '['+threshold.toFixed(2)+']' : '') + " " +
				 this.other_sel.describe() +
				 (this.constant || this.time == "start" ? '' : ' at the ' + this.time);
}

Selector.prototype.arraysIdentical = function(a1, a2) {
  if (a1.length !== a2.length) return false;
  for (var i=0; i<a1.length; i++) {
    if (a2.indexOf(a1[i]) === -1) return false;
  }
  return true;
}

// Copyright 2014, Erik Weitnauer.

/// Holds an array of selectors.
/// Can be in one of 3 different modes: 'unique', 'exists', 'all'
/// (the default is 'exists').
/// main_side is either 'left', 'right', 'both'
Solution = function(selector, main_side, mode) {
	this.sel = selector;
	selector.solution = this;
	this.mode = mode || 'exists';
	this.setMainSide(main_side);
	this.matchedAgainst = [];
	this.checks = {left: 0, right: 0};
	this.mmatches = { exists: {left: 0, right: 0}
	                , unique: {left: 0, right: 0}
	                , all: {left: 0, right: 0}};
	this.specificity = 0; // `= avg(scene_sel_ratios)`
	this.scene_sel_ratios = []; // `=1-n_i/N_i`, where `n_i` is the number of sel. objs
	                            // and `N_i` the total number of objs. in scene i
	this.scene_pair_count = 8;
	this.objects_seen = 0;
	this.objects_selected = 0;
//	this.selects_single_objs = true;
}

Solution.prototype.matches = function(side) {
	return this.mmatches[this.mode][side];
}

Solution.prototype.setMainSide = function (main_side) {
	this.main_side = main_side || 'both';
	this.other_side = {left: 'right', right: 'left'}[this.main_side];
  return this;
}

Solution.prototype.getWeakSide = function() {
	if (this.main_side === 'left') return 'right';
	if (this.main_side === 'right') return 'left';
	if (this.main_side === 'fail') return 'fail';
	if (this.main_side === 'both') {
		if (this.checks.left > this.matches('left')) return 'left'; // only right all matched
		if (this.checks.right > this.matches('right')) return 'right'; // only left all matched
		// all match
		return (this.matches('left') > this.matches('right')) ? 'right' : 'left';
	}
}

Solution.prototype.allMatch = function() {
	return (this.checks.left === this.matches('left')
	 && this.checks.right === this.matches('right'));
}

Solution.prototype.goodSidesCompatibleCount = function() {
	if (this.main_side === 'fail') return 0;
	if (this.main_side === 'left' || this.main_side === 'right')
	  return this.checks.left + this.checks.right;
	// main side is 'both'
	if (this.checks.left > this.matches('left')) { // right scenes all matched
		return this.matches('right');
	}
	if (this.checks.right > this.matches('right')) { // left scenes all matched
		return this.matches('left');
	}
	// left and right scenes all matched
	return Math.min(this.matches('left'), this.matches('right'));
}

/** Returns the number of checked scenes those match is incompatible with a solution. */
Solution.prototype.incompatibleMatchCount = function() {
	if (this.main_side === 'left' || this.main_side === 'right') return 0;
	if (this.main_side === 'fail') return this.scene_pair_count*2;
	// main_side is 'both'
	if (this.checks.left > this.matches('left')) { // right scenes all matched
		return this.matches('left');
	}
	if (this.checks.right > this.matches('right')) { // left scenes all matched
		return this.matches('right');
	}
	// left and right scenes all matched
	return Math.min(this.matches('left'), this.matches('right'));
}

Solution.prototype.uncheckedSceneCount = function() {
	return this.scene_pair_count*2 - this.checks.left - this.checks.right;
}

/** Returns the number of checked scenes those match is compatible with a solution. */
Solution.prototype.compatibleMatchCount = function() {
	if (this.main_side === 'fail') return 0;
	if (this.main_side === 'left' || this.main_side === 'right') {
	  return this.checks.left + this.checks.right;
	}
	// main_side is 'both'
	if (this.checks.left > this.matches('left')) { // right scenes all matched
		return this.matches('right') + (this.checks.left - this.matches('left'));
	}
	if (this.checks.right > this.matches('right')) { // left scenes all matched
		return this.matches('left') + (this.checks.right - this.matches('right'));
	}
	// left and right scenes all matched
	return Math.max(this.matches('left'), this.matches('right'));
}

Solution.prototype.isPotentialSolution = function() {
	return this.main_side === 'left' || this.main_side === 'right';
}

Solution.prototype.wasMatchedAgainst = function(scene_pair_id) {
	return this.matchedAgainst.indexOf(scene_pair_id) !== -1;
}

Solution.prototype.isSolution = function() {
	if (this.matchedAgainst.length < this.scene_pair_count) return false;
	return ( this.matches('right') === 0 && this.matches('left') == this.scene_pair_count
	      || this.matches('left') === 0 && this.matches('right') == this.scene_pair_count);
}

Solution.prototype.updateSpecificity = function(scene, group) {
	if (group.empty()) return;
	var s = 1-group.objs.length/scene.objs.length;
	this.scene_sel_ratios.push(s);
	this.specificity = 0;
	for (var i=0; i<this.scene_sel_ratios.length; i++) {
		this.specificity += this.scene_sel_ratios[i];
	}
	this.specificity /= this.scene_sel_ratios.length;
}

/// Returns whether combining this with the passed solution could in principle
/// be a solution.
Solution.prototype.compatibleWith = function(other) {
	if ( this.matches('left')   < this.checks.left
	  && other.matches('right') < other.checks.right) return false;
	if ( this.matches('right') < this.checks.right
	  && other.matches('left') < other.checks.left) return false;
	return true;
}

Solution.prototype.selectsSingleObjects = function() {
	return this.selects_single_objs.left === this.checks.left &&
	       this.selects_single_objs.right === this.checks.right;
}

Solution.prototype.selectsAllObjects = function() {
	return this.mmatches.all.left === this.checks.left &&
	       this.mmatches.all.right === this.checks.right;
}

Solution.prototype.selectsAllObjectsInAllScenes = function() {
	return (this.selectsAllObjects() && this.uncheckedSceneCount() === 0
		&& this.matches('left') === this.matches('right'));
}

Solution.prototype.tryMode = function(mode, type) {
	if (mode === 'unique' && this.sel.blank()) return false;
	var matches = this.mmatches[mode];
	if (type === 'one-sided') {
		if (matches.left === 0 && matches.right === this.checks.right)
		  this.setMainSide('right');
  	else if (matches.right === 0 && matches.left === this.checks.left)
  	  this.setMainSide('left');
  	else return false;
	} else if (type === 'two-sided') {
		if (matches.left > 0 && matches.right === this.checks.right)
		  this.setMainSide('both');
    else if (matches.right > 0 && matches.left === this.checks.left)
      this.setMainSide('both');
    else return false;
	} else throw "unknown mode";
	this.mode = mode;
  return true;
}

Solution.prototype.checkScenePair = function(pair, pair_id) {
  if (this.matchedAgainst.indexOf(pair_id) !== -1) throw 'already checked that scene pair id!';
  var self = this;
  var selected_groups = [];
  pair.forEach(function (scene) {
  	var res = self.check_scene(scene);
    selected_groups.push(res.group);
    self.objects_seen += scene.objs.length;
    self.objects_selected += res.group.objs.length;
    self.updateSpecificity(scene, res.group);
    self.checks[scene.side]++;
    if (res.match_count) {
    	self.mmatches.exists[scene.side]++;
    	if (res.match_count === 1) self.mmatches.unique[scene.side]++;
    	if (res.match_count === scene.objs.length) self.mmatches.all[scene.side]++;
    }
  });
  this.matchedAgainst.push(pair_id);
  //this.recheck_all_checked_scenes(); // ONLY FOR DEBUGGING

  if (!this.tryMode('exists', 'one-sided') &&
  	  !this.tryMode('all', 'one-sided') &&
  	  !this.tryMode('unique', 'two-sided') &&
  	  !this.tryMode('exists', 'two-sided')) this.setMainSide('fail');

  return selected_groups;
}

/// Attempts to turn a 'both' or 'fail' solution into a one-sided solution by
/// adjusting one of the thresholds of the solution's selector. Returns true if
/// such an adjustment was made.
Solution.prototype.adjustThresholds = function(main_side, left_scenes, right_scenes) {
	var ranges = { left: ActivityRanges.calcStats(this.sel, left_scenes)
							 , right: ActivityRanges.calcStats(this.sel, right_scenes)};
	var other_side = (main_side === 'left' ? 'right' : 'left');
	var thresh;

	for (var key in ranges.left) {
		var main = ranges[main_side][key]
		  , other = ranges[other_side][key];

		// check for 'exists' solution
		if (other.maxmax < main.minmax) thresh = (other.maxmax + main.minmax)/2;

		// check for 'all' solution
		if (other.maxmin < main.minmin) thresh = (other.maxmin + main.minmin)/2;

		if (thresh && 0.15 <= thresh && 0.85 >= thresh) {
			var key_no_time = key.substr(key.indexOf('.')+1); // start.stable.object ==> stable.object
			this.sel.thresholds[key_no_time] = thresh;
			return true;
		}
	}

	return false;
}

/// Call this whenever the underlying selector is changed.
Solution.prototype.reset = function() {
	this.matchedAgainst = [];
	this.checks = {left: 0, right: 0};
	this.mmatches = { exists: {left: 0, right: 0}
	                , unique: {left: 0, right: 0}
	                , all: {left: 0, right: 0}};
	this.specificity = 0;
	this.scene_sel_ratios = [];
	this.scene_pair_count = 8;
	this.objects_seen = 0;
	this.objects_selected = 0;
}

Solution.prototype.check = function(scenes_l, scenes_r) {
	if (this.main_side !== 'left' && this.main_side !== 'right') return false;

	var main_scenes  = this.main_side == 'left'  ? scenes_l : scenes_r
	   ,other_scenes = this.main_side == 'right' ? scenes_l : scenes_r
	   ,self = this;

  var check_scene = function(scene) {
  	return self.check_scene(scene, true).match;
  }

	return (main_scenes.every(check_scene)
	     && !other_scenes.some(check_scene));
}

Solution.prototype.equals = function(other) {
	return (this.mode === other.mode
	     && this.sel.equals(other.sel));
}

Solution.prototype.mergedWith = function(other) {
	var mode = 'exists'; // always use 'exists' as we automatically switch to the
	                     // other modes if needed
	var side;
	if (other.main_side === this.main_side) side = this.main_side;
	else if (this.main_side === 'both') side = other.main_side;
	else if (other.main_side === 'both') side = this.main_side;
	else return null; // incompatible sides
	return new Solution(this.sel.mergedWith(other.sel), side, mode);
}

Solution.prototype.clone = function() {
	return new Solution(this.sel.clone(), this.main_side, this.mode);
}

/// Returns a group node that contains all objects that match the solution
/// in the passed scene.
Solution.prototype.applyToScene = function(scene) {
	if (this.main_side === 'left' && scene.side !== 'left') return new GroupNode(null, [], this.sel);
	if (this.main_side === 'right' && scene.side !== 'right') return new GroupNode(null, [], this.sel);
	return this.sel.applyToScene(scene);
}

/// Applies all selectors consecutively to the scene and checks
/// whether the resulting group of objects fits the mode of the
/// solution. It returns an object { match: boolean, group: GroupNode }
/// where group is the group of the selected nodes.
/// If no_caching is passed as true, all scene matches will be recomputed
/// and will not be cached.
Solution.prototype.check_scene = function(scene, no_caching) {
	var group = this.sel.applyToScene(scene, no_caching);
	var N = group.objs.length;
	var res = false;
	if (this.mode == 'unique' && N == 1) res = true;
	else if (this.mode === 'exists' && N > 0) res = true;
	else if (this.mode === 'all' && N > 0 &&
	    scene.objs.length === N) res = true;
	scene.fits_solution = res;
	return { match: res, group: group, match_count: N };
}

/// ONLY USED FOR DEBUGGING
///   to find the wrong solution bug
// Solution.prototype.recheck_all_checked_scenes = function() {
// 	var ws = tester.ws, self = this;
// 	var left = 0, right = 0;
// 	this.matchedAgainst.forEach(function(pair_id) {
// 		var scenes = ws.getScenePairById(pair_id);
// 		if (self.check_scene(scenes[0], true).match_count) {
// 			if (scenes[0].side == 'left') left++;
// 			else right++;
// 		}
// 		if (self.check_scene(scenes[1], true).match_count) {
// 			if (scenes[1].side == 'left') left++;
// 			else right++;
// 		}
// 	});
// 	if (this.mmatches.exists.left !== left || this.mmatches.exists.right !== right) {
// 		//throw "mismatch!!";
// 		this.matchedAgainst.forEach(function(pair_id) {
// 		var scenes = ws.getScenePairById(pair_id);
// 		if (self.check_scene(scenes[0], true).match_count) {
// 			if (scenes[0].side == 'left') left++;
// 			else right++;
// 		}
// 		if (self.check_scene(scenes[1], true).match_count) {
// 			if (scenes[1].side == 'left') left++;
// 			else right++;
// 		}
// 		});
// 	}
// }

/// Returns a human readable description of the solution.
Solution.prototype.describe = function() {
	var str = "";
	if (this.main_side) str += this.main_side === 'both' ? "In all scenes, " : "Only in the " + this.main_side + " scenes, ";
	str += this.mode + ': ' + this.sel.describe();
	return str;
};
/// Used to keep track of feature activation ranges seen over the scenes of
/// each side (minmin, minmax, maxmin, maxmax per side).
/// Based on this information, the threshold of a feature can be adjusted to
/// allow for a solution.
ActivityRanges = function() {
	this.ranges = {};
}

ActivityRanges.update = function(percept, time) {
	var scene;
	if (percept.obj) scene = percept.obj.object_node.scene_node;
	else scene = percept.group.scene_node;
	scene.activity_ranges.update(percept, time);
}

ActivityRanges.prototype.update = function(percept, time) {
	var key = time + '.' + percept.key + '.'
	        + (percept.targetType === 'obj' ? 'object' : 'group');
	var act = percept.get_activity();

	if (!this.ranges[key]) this.ranges[key] = { min: 1, max: 0 };

	var d = this.ranges[key];

	d.min = Math.min(d.min, act);
	d.max = Math.max(d.max, act);
}

ActivityRanges.prototype.get = function(key) {
	return this.ranges[key];
}

ActivityRanges.calcStats = function(selector, scenes) {
	var res = {};
	selector.forEachMatcher(function(m) {
		var key = m.time + '.' + m.key + '.' + m.type;
		if (!res[key]) res[key] = { minmin:1, minmax:1, maxmin:0, maxmax:0 };
		for (var i=0; i<scenes.length; i++) {
	  	var range = scenes[i].activity_ranges.ranges[key];
	  	if (!range) continue;
	  	res[key].minmin = Math.min(range.min, res[key].minmin);
	  	res[key].minmax = Math.min(range.max, res[key].minmax);
	  	res[key].maxmin = Math.max(range.min, res[key].maxmin);
	  	res[key].maxmax = Math.max(range.max, res[key].maxmax);
		}
	});
	return res;
}
// Copyright Erik Weitnauer 2014

/**
 * The AttentionNet keeps track of an attention value for each attribute,
 * relationship and solution added to it. It can visualize solutions and
 * features with their attention values. It can be used to increase and
 * decrease attention, as well as retrieving attention.
 *
 * The attention base values are translated into the real attention values
 * using a sigmoid function. Attention values should only be changed using
 * the addToAttentionValue function.
 */
AttentionNet = function(options) {
	this.features = [];
	this.solutions = [];
	this.objects = [];
	this.objects_by_scene = null; // internal cache, keys are scene ids
	this.groups = [];
	this.attention_values = new WeakMap();
	this.feature_groups = [];

	this.feature_base = options.activity.feature.hyp_base;
	this.object_base = options.activity.obj.hyp_base;
	this.obj_attr_priors = options.activity.obj.attr_priors;
	this.group_attr_priors = options.activity.group.attr_priors;
	this.group_base = options.activity.group.hyp_base;
	this.sol_attr_priors = options.activity.selector.attr_priors;
	this.sol_rel_priors = options.activity.selector.rel_priors;
}

/// Can throw "unknown element" exception.
AttentionNet.prototype.getActivity = function(el) {
	if (!this.attention_values.has(el)) throw "unknown element";
	return this.attention_values.get(el);
}

AttentionNet.prototype.updateActivities = function(scenes) {
	var self = this;
	this.solutions.forEach(function(sol) {
		self.attention_values.set(sol, self.calcSolutionActivity(sol))
	});
	this.normalize('solutions');

	this.features.forEach(function(feat) {
		self.attention_values.set(feat, self.calcFeatureSelfActivity(feat))
	});
	// uncomment the following to use feature group activity spreading
	// this.feature_groups.forEach(function(fg) {
	// 	self.attention_values.set(fg, self.calcFeatureGroupActivity(fg))
	// });
	// this.features.forEach(function(feat) {
	// 	self.attention_values.set(feat, self.calcFeatureActivity(feat));
	// });
	this.normalize('features');

	this.objects.forEach(function(obj) {
		self.attention_values.set(obj, self.calcObjectActivity(obj))
	});
	this.normalize('objects', scenes);

	this.groups.forEach(function(grp) {
		self.attention_values.set(grp, self.calcGroupActivity(grp))
	});
	this.normalize('groups', scenes);
}

AttentionNet.prototype.calcSolutionActivity = function(sol) {
	if (sol.main_side === 'fail') return 0;
	if (!sol.sel.blank() && sol.selectsAllObjectsInAllScenes()) return 0;
	var exp = sol.uncheckedSceneCount() + sol.sel.getComplexity();
	if (sol.main_side === 'both') {
		exp += sol.scene_pair_count;
		if (!sol.allMatch()) // || !sol.sel.base_level_only())
		  exp += sol.incompatibleMatchCount();
	}
	return Math.pow(2, -exp) * this.getSolutionPrior(sol);
}

AttentionNet.prototype.calcFeatureSelfActivity = function(feat) {
	//return 1;
	var self = this;
	var sum = d3.sum(this.solutions, function(sol) {
		if (!sol.sel.hasFeatureType(feat.prototype)) return 0;
		else return self.getActivity(sol);
	});
	var val = feat.prototype.apriori * (this.feature_base+sum);
	return val;
}

AttentionNet.prototype.calcFeatureActivity = function(feat) {
	var fg = this.getOrCreateFeatureGroupByName(feat.group_name);
	var f_act = this.getActivity(feat)
	  , g_act = this.getActivity(fg)
	  , res = f_act + Math.max(0, 0.5*(g_act - f_act));
	//console.log(feat.prototype.key, 'self', f_act, 'group', g_act, 'res', res);
	return res;
}

AttentionNet.prototype.calcFeatureGroupActivity = function(fg) {
	var sum = 0;
	for (var i=0; i<fg.members.length; i++) {
	  sum += this.getActivity(fg.members[i]);
	}
	return sum/fg.members.length;
}

AttentionNet.prototype.calcObjectActivity = function(obj) {
	//return 1;
	var self = this;
	var sum = d3.sum(obj.selectors, function(sel) {
		var sel_group = sel.getCachedResult(obj.scene_node);
		return self.getActivity(sel.solution) / sel_group.objs.length;
	});
	return this.getObjectPrior(obj) * (this.object_base+sum);
}

AttentionNet.prototype.calcGroupActivity = function(grp) {
	var self = this;
	var sum = d3.sum(grp.selectors, function(sel) {
		return self.getActivity(sel.solution);
	});
	return this.getGroupPrior(grp) * (this.group_base+sum);
}

AttentionNet.prototype.getObjectPrior = function(obj) {
	var prod = 1, perception;
	for (var attr in this.obj_attr_priors) {
		perception = obj.getDeliberateOnly(attr, {time: 'start'});
		if (perception && this.isActive(perception)) prod *= this.obj_attr_priors[attr];
	}
	// The following is an imperfect implementation of relation priors
	// 	perception = obj.getDeliberateOnly(rel, {time: 'start'});
	// 	if (perception && this.isActive(perception)) prod *= this.obj_rel_priors[rel][0];
	// 	// we should also check for this object being the `other` object in a relationship
	// }
	return prod;
}

AttentionNet.prototype.getSolutionPrior = function(sol) {
	var prod = 1;
	for (var attr in this.sol_attr_priors) {
		if (sol.sel.hasAttr(attr)) prod *= this.sol_attr_priors[attr];
	}
	for (var rel in this.sol_rel_priors) {
		if (sol.sel.hasRel(rel)) prod *= this.sol_rel_priors[rel];
	}
	return prod;
}

AttentionNet.prototype.getGroupPrior = function(group) {
	var prod = 1, perception;
	for (var attr in this.group_attr_priors) {
		perception = group.getDeliberateOnly(attr, {time: 'start'});
		if (perception && this.isActive(perception)) prod *= this.group_attr_priors[attr];
	}
	return prod;
}

AttentionNet.prototype.isActive = function(percept) {
  return percept.get_activity() > pbpSettings.activation_threshold;
}

/// Updates all attention values, so that for 'features', 'solutions'
/// and 'objects' the attentions add up to 1 (per scene for objects).
/// The `type` argument is optional, if not passed, all types are
/// normalized.
AttentionNet.prototype.normalize = function(type, scenes) {
	if (!type) {
		this.normalize('features');
		this.normalize('solutions');
		this.normalize('objects');
		this.normalize('groups');
		return;
	}
	if (type === 'objects') {
		for (var i=0; i<scenes.length; i++) this.normalizeElements(scenes[i].objs);
	} else if (type === 'groups') {
		for (var i=0; i<scenes.length; i++) this.normalizeElements(scenes[i].groups);
	} else {
		this.normalizeElements(this[type]);
	}
}

/// Scales the attention values of the passed elements so they sum up to 1.
/// If the sum of attention values is 0, all values are set to 1/N.
AttentionNet.prototype.normalizeElements = function(els) {
	var sum = 0, i;
	for (i=0; i<els.length; i++) sum += this.attention_values.get(els[i]);
	if (sum === 0) {
		for (i=0; i<els.length; i++) {
			this.attention_values.set(els[i], 1/els.length);
		}
	} else {
		for (i=0; i<els.length; i++) {
			this.attention_values.set(els[i], this.attention_values.get(els[i])/sum);
		}
	}
}

/// Returns all objects grouped by scenes. Will cache results of first call,
/// so only call after all objects were added.
AttentionNet.prototype.objectsByScene = function() {
	if (!this.objects_by_scene) {
		var objs = {}, obj;
		for (var i=0; i<this.objects.length; i++) {
		  obj = this.objects[i];
		  if (!(obj.scene_node.id in objs)) objs[obj.scene_node.id] = [];
		  objs[obj.scene_node.id].push(obj);
		}
		this.objects_by_scene = objs;
	}
	return this.objects_by_scene;
}

/// Returns all groups grouped by scenes.
AttentionNet.prototype.groupsByScene = function() {
	var groups = {}, group;
	for (var i=0; i<this.groups.length; i++) {
	  group = this.groups[i];
	  if (!(group.scene_node.id in groups)) groups[group.scene_node.id] = [];
	  groups[group.scene_node.id].push(group);
	}
	return groups;
}

/// Type can be 'feature', 'solution' and 'object'. Optionally pass an
/// attention value (default: 1.0).
/// Returns true if successfully inserted.
AttentionNet.prototype.addElement = function(type, element, val) {
	if (typeof(val) === 'undefined') val = 1.0;
	var map = {feature: this.features, solution: this.solutions, object: this.objects, group: this.groups};
	var arr = map[type];
	if (!arr) return false;
	if (arr.indexOf(element) != -1) return false;
	arr.push(element);
	this.attention_values.set(element, val);
	return true;
}

AttentionNet.prototype.getOrCreateFeatureGroupByName = function(name) {
	var fgs = this.feature_groups.filter(function(fg) { return fg.name === name });
	if (fgs.length === 0) {
		var fg = { name: name, members: [] };
		this.feature_groups.push(fg);
		return fg;
	}
	return fgs[0];
}

/// Returns true if successfully inserted. Optionally pass an attention value
/// (default: 1.0).
AttentionNet.prototype.addFeature = function(feature, group_name, val) {
	var fg = this.getOrCreateFeatureGroupByName(group_name);
	fg.members.push(feature);
	feature.group_name = group_name;
	return this.addElement('feature', feature, val);
}

/// Returns true if successfully inserted. Optionally pass an attention value
/// (default: 1.0).
AttentionNet.prototype.addSolution = function(solution, val) {
	return this.addElement('solution', solution, val);
}

/// Returns true if successfully inserted. Optionally pass an attention value
/// (default: 1.0).
AttentionNet.prototype.addObject = function(object, val) {
	return this.addElement('object', object, val);
}

/// Returns true if successfully inserted. Optionally pass an attention value
/// (default: 1.0).
AttentionNet.prototype.addGroup = function(group, val) {
	return this.addElement('group', group, val);
}

/// Chooses a random object from the passed scene based on their attention values.
/// If the objects have a summed activity of 0, any on of them is picked.
/// Available options:
/// filter (ObjectNode->bool)
AttentionNet.prototype.getRandomObject = function(scene, options) {
	options = options || {};
	var self = this;
	var activity_sum = 0;
	var pool = options.pool || scene.objs;
	var objs = pool.filter(function(obj) {
		if (!options.filter || options.filter(obj)) {
			activity_sum += self.getActivity(obj);
			return true;
		} else return false;
	});
	if (objs.length === 0) return null;
	if (activity_sum > 0) return Random.pick_weighted(objs, function (obj) {
		return self.getActivity(obj);
	});
	else return Random.pick(objs);
}

/// Chooses a random group from the passed scene based on their attention values.
/// If the groups have a summed activity of 0, null is returned.
/// Available options:
/// filter (GroupNode->bool)
AttentionNet.prototype.getRandomGroup = function(scene, options) {
	options = options || {};
	var self = this;
	var groups = scene.groups.filter(function(group) {
		return ( self.getActivity(group) > 0
			    && (!options.filter || options.filter(group)));
	});
	if (groups.length === 0) return null;
	return Random.pick_weighted(groups, function (group) {
		return self.getActivity(group);
	});
}

/// Chooses a random object from the passed scene based on their attention values.
/// Available options: type ('obj' or 'group'), filter (Feature->bool), pool (array)
AttentionNet.prototype.getRandomFeature = function(options) {
	options = options || {};
	var self = this;
	var pool = options.pool || this.features;
	var features = pool.filter(function(feature) {
		return ( self.getActivity(feature) > 0
			   && (!options.type || feature.prototype.targetType === options.type)
		     && (!options.filter || options.filter(feature)));
	});
	if (features.length === 0) return null;
	return Random.pick_weighted(features, function (feature) {
		return self.getActivity(feature);
	});
}

/// Chooses a random object from the passed scene based on their attention values.
/// Available options:
/// no_blank (bool), type ('group' or 'object'),
/// filter (function), pool (array), main_side ('both', 'left', 'right', 'fail')
AttentionNet.prototype.getRandomSolution = function(options) {
	options = options || {};
	var self = this;
	var pool = options.pool || this.solutions;
	var sols = pool.filter(function(sol) {
		return (self.getActivity(sol) > 0
			&& (!options.no_blank || !sol.sel.blank())
		  && (!options.type || sol.sel.getType() === options.type)
		  && (!options.filter || options.filter(sol)));
	});
	if (sols.length === 0) return null;
	return Random.pick_weighted(sols, function (sol) {
		return self.getActivity(sol);
	});
}
/// Copyright by Erik Weitnauer, 2013.

/// A SceneNode is a collection of several objects.
SceneNode = function(scene, oracle) {
  this.scene = scene;
  this.side = scene.side;
  this.id = scene.name || ('s'+Math.round(Math.random()*10000));
  this.oracle = oracle;
  this.objs = [];      // list of objects in the scene
  this.groups = [];    // list of object groups in the scene
  this.ground = null;
  this.frame = null;
  this.collisions = []; // list of collisions
  this.times = ['start', 'end'];
  this.activity_ranges = new ActivityRanges();
  this.init();
}

SceneNode.prototype.getAllGroup = function() {
  return GroupNode.sceneGroup(this);
}

SceneNode.prototype.getGroupByNodes = function(nodes) {
  var gs = this.groups.filter(function(group) {
    return SceneNode.same_elements(group.objs, nodes);
  });
  if (gs.length === 0) return null;
  return gs[0];
}

SceneNode.prototype.init = function() {
  var movables = [], shapes = this.scene.shapes;
  for (var i=0; i<shapes.length; i++) {
    if (shapes[i].movable) movables.push(shapes[i]);
    else if (shapes[i].id == '_') this.ground = shapes[i];
    else if (shapes[i].id == '|') this.frame = shapes[i];
  }
}

/// Creates an empty ObjectNode for each shape in the scene that does not have an
/// associated ObjectNode yet.
SceneNode.prototype.registerObjects = function() {
  var movables = this.scene.shapes.filter(function(s) { return s.movable });
  for (var i=0; i<movables.length; i++) {
    if (!movables[i].object_node) this.objs.push(new ObjectNode(this, movables[i]));
  }
  if (!this.ground.object_node) this.ground.object_node = new ObjectNode(this, this.ground);
}

/// Records the start state, simulates till the end state while recording all
/// collisions and records the end state.
SceneNode.prototype.perceiveCollisions = function() {
  this.oracle.gotoState("start");
  this.collisions = this.oracle.observeCollisions();
  // replace physical objects with shapes
  for (var i=0; i<this.collisions.length; i++) {
    this.collisions[i].a = this.collisions[i].a.master_obj;
    this.collisions[i].b = this.collisions[i].b.master_obj;
  }
}

/// Returns an SceneNode instance, which is the perception of the passed scene.
/// For now brute force: All movable objects in the scene are automatically
/// with all their attributes and relationships with each other for one snapshot
/// at the beginning and one snapshot at the end of time.
SceneNode.prototype.perceiveAll = function() {
  this.perceiveCollisions();
  for (var t=0; t<this.times.length; t++) {
    this.oracle.gotoState(this.times[t]);
    this.perceiveCurrent(this.times[t]);
  }
}

SceneNode.prototype.perceiveCurrent = function(state_name) {
  state_name = state_name || 'current';
  this.registerObjects();
  for (var i=0; i<this.objs.length; i++) this.objs[i].perceive(state_name);
}

SceneNode.same_elements = function(as, bs) {
  if (as.length !== bs.length) return false;
  for (var i=0; i<as.length; i++) if (bs.indexOf(as[i]) === -1) return false;
  return true;
}

/// Returns a human readable description of the scene.
SceneNode.prototype.describe = function(prefix) {
  prefix = prefix || '';
  var res = [prefix+'Objects:'];
  for (var i=0; i<this.objs.length; i++) {
    res.push(this.objs[i].describe(prefix+'  '));
  };
  res.push(prefix+'Collisions:');
  for (var i=0; i<this.collisions.length; i++) {
    var c = this.collisions[i];
    res.push(prefix + '  ' + c.a.id + ' hits ' + c.b.id);
  };
  return res.join("\n");
}
/// Untility functions connected with random drawing of elements.
var Random = {};

/// Pass an array of N probabilities and the function will return
/// a random index in 0...N-1, picked according to the probabilities.
/// Pass normalized as true if the probs add up to 1. The default is false.
Random.weighted = function(probs, normalized) {
	var r = Math.random();
	if (!normalized) r *= probs.reduce(function(a,b){return a+b});
	var sum = 0;
	var idx = -1;
	while (r>sum) { idx++; sum+=probs[idx] }
	return idx;
}

/// Like Random.weighted(), but will return the element of the array
/// instead of the index. Pass an accessor functions that returns the
/// weight when passed the element.
/// If you know that the sum of all weights is 1, you can pass normalized
/// as true to make things more efficient.
Random.pick_weighted = function(xs, accessor, normalized) {
	if (xs.length == 0) throw "empty list";
	var idx = Random.weighted(xs.map(accessor), normalized);
	if (idx == -1) throw "sum of probabilities must be bigger than 1";
	return xs[idx];
}

/// Returns a random integer in 0...upper-1.
Random.int = function(upper) {
	return Math.floor(Math.random()*upper)
}

/// Returns a random element from the passed array.
Random.pick = function(vals) {
	if (vals.length == 0) throw "empty list";
	return vals[Random.int(vals.length)];
}

/// Picks N random elements from the passed array without
/// repetition and returns them as an array.
Random.pickN = function(n, vals) {
	if (n == 0) return [];
	if (n > vals.length) throw "N bigger than number of elements";
	var perm = Random.permutation(vals.length).slice(0,n);
	return perm.map(function (val, i) { return vals[perm[i]] });
}

/// Returns a random permuation of the numbers 0...N-1 in an array.
Random.permutation = function(N) {
  var a = [];
  for (var n=0; n<N; n++) {
    var i = Math.round(Math.random()*n);
    var v = a[i];
    a[i] = n;
    if (i != n) a[n] = v;
  }
  return a;
}

/// Creates a function uid() that returns a random hex number with 16 digets as string.
;(function() {
  var b32 = 0x100000000, f = 0xf, b = []
      str = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'];
  function uid() {
    var i = 0;
    var r = Math.random()*b32;
    b[i++] = str[r & f];
    b[i++] = str[r>>>4 & f];
    b[i++] = str[r>>>8 & f];
    b[i++] = str[r>>>12 & f];
    b[i++] = str[r>>>16 & f];
    b[i++] = str[r>>>20 & f];
    b[i++] = str[r>>>24 & f];
    b[i++] = str[r>>>28 & f];
    r = Math.random()*b32;
    b[i++] = str[r & f];
    b[i++] = str[r>>>4 & f];
    b[i++] = str[r>>>8 & f];
    b[i++] = str[r>>>12 & f];
    b[i++] = str[r>>>16 & f];
    b[i++] = str[r>>>20 & f];
    b[i++] = str[r>>>24 & f];
    b[i++] = str[r>>>28 & f];
    return "_" + b.join("");
  };
  Random.uid = uid;
})();
/// The workspace is a container for all objects the interpreter works with
/// and has some utility functions for accessing them.
var Workspace = function(scenes, options, log_level) {
  this.scenes = scenes;
  this.left_scenes = scenes.filter(function(sn) { return sn.side == 'left'});
  this.right_scenes = scenes.filter(function(sn) { return sn.side == 'right'});

  this.options = options;

  this.perception_count = 0;
  this.retrieval_count = 0;
  this.register_events();

  this.solutions = []; // will hold all correct solutions that were found

  this.log_level = {debug: 4, info: 3, warn: 2, error: 1, no: 0}[log_level || 'no'];
  this.log_symbol = {1: 'EE', 2: 'WW', 3: 'II', 4: 'DB'};
  this.step = 1;

  this.events = d3.dispatch('switched_scenes');

  this.scene_pair_sequence = this.generateSceneSequence(options.randomize_row_order);
  this.scene_pair_index = 0;
  this.scene_pair_steps = 0;
  this.active_scene_pair = this.scene_pair_sequence[0];

  this.attentionNet = new AttentionNet(this.options);
  anet = this.attentionNet;
  this.initAttentionNet();
  this.coderack = new Coderack(this);

  this.logCallback = null;
}

Workspace.prototype.generateSceneSequence = function(randomize_row_order) {
  // CAUTION: the 1st and 2nd sim/dis values refer to the w/i and b/w *pair*
  // similarity. It is almost identical to the w/i and b/w *category* similarity,
  // with the only difference that interleaved-sim-dis and interleaved-dis-sim
  // are swapped.
  var seqs8 = { 'interleaved-sim-sim': ['A1B1', 'A2B2', 'A3B3', 'A4B4', 'A5B5', 'A6B6', 'A7B7', 'A8B8']  // wip: 8 bwp: 4 | wic: 8 bwc: 4
              , 'interleaved-sim-dis': ['A1B1', 'A3B3', 'A5B5', 'A7B7', 'A2B2', 'A4B4', 'A6B6', 'A8B8']  // wip: 8 bwp: 0 | wic: 0 bwc: 8
              , 'interleaved-dis-sim': ['A1B3', 'A2B4', 'A3B5', 'A4B6', 'A5B7', 'A6B8', 'A7B1', 'A8B2']  // wip: 0 bwp: 4 | wic: 4 bwc: 0
              , 'interleaved-dis-dis': ['A1B3', 'A5B7', 'A4B2', 'A8B6', 'A3B1', 'A7B5', 'A2B4', 'A6B8']  // wip: 0 bwp: 0 | wic: 0 bwc: 0
              , 'blocked-sim-sim': ['A1A2', 'B1B2', 'A3A4', 'B3B4', 'A5A6', 'B5B6', 'A7A8', 'B7B8']      // wip: 8 bwp: 4 | wic: 8 bwc: 4
              , 'blocked-sim-dis': ['A1A2', 'B3B4', 'A5A6', 'B7B8', 'A3A4', 'B1B2', 'A7A8', 'B5B6']      // wip: 8 bwp: 0 | wic: 8 bwc: 0
              , 'blocked-dis-sim': ['A1A3', 'B1B3', 'A2A4', 'B2B4', 'A5A7', 'B5B7', 'A6A8', 'B6B8']      // wip: 0 bwp: 6 | wic: 0 bwc: 6
              , 'blocked-dis-dis': ['A1A5', 'B3B7', 'A6A2', 'B8B4', 'A7A3', 'B5B1', 'A4A8', 'B2B6']};    // wip: 0 bwp: 2 | wic: 0 bwc: 2
  var lsn = this.left_scenes, rsn = this.right_scenes;
  if (randomize_row_order) {
    var row_map = Random.permutation(4);
    var lsn_rnd = [], rsn_rnd = [];
    for (var i=0; i<row_map.length; i++) {
      var idx = row_map[i];
      lsn_rnd.push(lsn[2*idx], lsn[2*idx+1]);
      rsn_rnd.push(rsn[2*idx], rsn[2*idx+1]);
    }
    lsn = lsn_rnd;
    rsn = rsn_rnd;
  }

  return seqs8[this.options.pres_mode].map(function(str) {
    return [(str[0] === 'A' ? lsn : rsn)[+str[1]-1]
           ,(str[2] === 'A' ? lsn : rsn)[+str[3]-1]];
  });
}

Workspace.prototype.advanceScenePair = function() {
  this.scene_pair_steps = 0;
  this.scene_pair_index = (this.scene_pair_index+1) % this.scene_pair_sequence.length;
  this.active_scene_pair = this.scene_pair_sequence[this.scene_pair_index];
  this.events.switched_scenes();
}

Workspace.prototype.forEachScene = function(fn) {
  for (var i=0; i<this.left_scenes.length; i++) fn(this.left_scenes[i]);
  for (var i=0; i<this.right_scenes.length; i++) fn(this.right_scenes[i]);
}

Workspace.prototype.perceived_feature = function(event) {
  this.perception_count++;
  this.log_perception('perceived', event, 3);
}

Workspace.prototype.retrieved_feature = function(event) {
  if (event.only_checking) return;
  this.retrieval_count++;
  this.log_perception('retrieved', event, 4);
}

Workspace.prototype.log_perception = function(type, event, log_level) {
  var type = (event.deliberate ? 'deliberately ' : '') + type;
  if (event.percept.arity === 1) {
    this.log(log_level, type, event.percept.key
                 , '(t=' + event.time + ') on'
                 , this.getDescription(event.target) + ':'
                 , event.percept.get_activity());
  } else if (event.percept.arity === 2) {
    this.log(log_level, type, event.percept.key
             , '(t=' + event.time + ') on'
             , this.getDescription(event.target), 'and'
             , this.getDescription(event.other) + ':'
             , event.percept.get_activity());
  }
}

/// Pass an array of object or scene nodes to setup the perceived and retrieved
/// listeners. If called without argument, all object nodes will be registered.
Workspace.prototype.register_events = function() {
  ObjectNode.events.on('perceived', this.perceived_feature.bind(this));
  ObjectNode.events.on('retrieved', this.retrieved_feature.bind(this));
  GroupNode.events.on('perceived', this.perceived_feature.bind(this));
  GroupNode.events.on('retrieved', this.retrieved_feature.bind(this));
}

Workspace.prototype.initAttentionNet = function() {
  var aNet = this.attentionNet, options = this.options;

  var blank_sol = new Solution(new Selector(), 'both');
  this.addHypothesis(blank_sol);
  this.blank_hypothesis = blank_sol;

  this.scenes.forEach(function (sn) {
    sn.objs.forEach(function (on) { aNet.addObject(on) });
    blank_sol.sel.applyToScene(sn); // create the all group so there is at least
                                    // one group on which group attributes can be
                                    // perceived
  });

  options.features.forEach(function (info) {
    info.klass.prototype.apriori = info.initial_activation;
    info.klass.prototype.initial_apriori = info.initial_activation;
    aNet.addFeature(info.klass, info.group, 1/options.features.length);
  });

  aNet.updateActivities(this.scenes);
}

Workspace.prototype.getAttention = function(thing) {
  return this.attentionNet.getActivity(thing);
}

Workspace.prototype.getHypothesisInfoArray = function() {
  var self = this;
  return this.attentionNet.solutions.map(function(sol) {
    return { val: self.attentionNet.getActivity(sol)
           , sol: sol.describe()
           , src: sol }
  });
}

/// Type can be 'attr' or 'rel'.
Workspace.prototype.setSelectorPrior = function(feature_key, type, prior) {
  var sel = this.options.activity.selector;
  sel[type+'_priors'][feature_key] = prior;
  this.attentionNet.updateActivities(this.scenes);
}

Workspace.prototype.setFeaturePrior = function(feature, prior) {
  feature.prototype.apriori = prior;
  this.attentionNet.updateActivities(this.scenes);
}

Workspace.prototype.resetFeaturePrior = function(feature) {
  var fs = this.options.features.filter(function(f) { return feature === f.klass});
  if (fs.length !== 1) throw "could not find feature " + feature.prototype.key;
  feature.prototype.apriori = fs[0].initial_activation;
  this.attentionNet.updateActivities(this.scenes);
}

Workspace.prototype.getFeatureInfoArray = function() {
  var self = this;
  return this.attentionNet.features.map(function(feature) {
    return { key: feature.prototype.key
           , val: self.attentionNet.getActivity(feature)
           , src: feature };
  });
}

Workspace.prototype.log = function(level) {
  if (this.log_level < level) return;
  var lvl = level;
  level = (level === 3 ? '' : this.log_symbol[level])
        + '[' + this.step + ']';
  if (this.logCallback) {
    var msg = Array.prototype.join.call(arguments, ' ');
    this.logCallback(msg);
  } else {
    if (lvl == 1) console.error.apply(console, arguments);
    else if (lvl == 2) console.warn.apply(console, arguments);
    else if (lvl == 3) console.info.apply(console, arguments);
    else console.log.apply(console, arguments);
  }
}

// TODO: attention net should handle this later (maybe)
Workspace.prototype.getRandomTime = function() {
  var options = this.options;
  return Random.pick_weighted(['start', 'end'], function(el) {
    return options.activity.time[el];
  });
}

// TODO: implement an attention shifting algorithm that shifts
// attention from old to new scenes slowly over time.
Workspace.prototype.getActiveScenePair = function() {
  return this.active_scene_pair;
}

Workspace.prototype.getScenePairById = function(id) {
  return this.scene_pair_sequence[id];
}

/// Available options: type ('obj' or 'group'), filter (Feature->bool)
Workspace.prototype.getRandomFeature = function(options) {
  return this.attentionNet.getRandomFeature(options);
}

Workspace.prototype.getRandomHypothesis = function(options) {
  return this.attentionNet.getRandomSolution(options);
}

/// Returns true if the solution was new and inserted.
Workspace.prototype.addHypothesis = function(hyp) {
  if (!this.isNewHypothesis(hyp)) return false;
  this.attentionNet.addSolution(hyp);
  hyp.sel.solution = hyp;
  this.log(3, 'added solution hypothesis', hyp.describe());
  return true;
}

Workspace.prototype.isNewHypothesis = function(hyp) {
  return this.attentionNet.solutions.every(function (other) {
    return !other.sel.equals(hyp.sel) // we ignore the solution mode
  });
}

Workspace.prototype.getEquivalentHypothesis = function(hyp) {
  for (var i=0; i<this.attentionNet.solutions.length; i++) {
    var existing = this.attentionNet.solutions[i];
    if (existing.sel.equals(hyp.sel)) return existing;
  }
  return null;
}

Workspace.prototype.addSolution = function(sol) {
  // do a safety check
  if (!sol.check(this.left_scenes.slice(0,8), this.right_scenes.slice(0,8))) {
    console.error('This "solution" is not valid:', sol.describe());
    console.error(sol);
    throw "this aint no solution!";
  }
  this.solutions.push(sol);
  this.log(3, 'adding solution:', sol.describe());
}

/// Adds a group to the attention net, but only if that group is registered in the groups
/// array of its scene. Otherwise it is either an empty group or was created when matching
/// a reference-selector (other_sel in rel-matcher) and should not be taken into account
/// during activity calculations.
Workspace.prototype.addGroup = function(group) {
  if (group.scene_node.groups.indexOf(group) !== -1) this.attentionNet.addGroup(group);
}

/// Selects a random group from the passed scene based on the attention values
/// of the respective group's selectors. Returns null if no group could be
/// selected. Options: filter (GroupNode->bool)
Workspace.prototype.getExistingRandomGroup = function(scene, options) {
  return this.attentionNet.getRandomGroup(scene, options);
  // var group_pool = scene.groups;
  // if (options && options.filter) group_pool = group_pool.filter(options.filter);
  // var sel_pool = [];
  // group_pool.forEach(function(group) { sel_pool = sel_pool.concat(group.selectors) });

  // var hyp = this.getRandomHypothesis({filter: function(hyp) {
  //   return sel_pool.indexOf(hyp.sel) !== -1;
  // }});
  // var res = null;
  // if (hyp) res = hyp.sel.getCachedResult(scene);
  // return res;
}

/** Selects a group based on a randomly chosen hypothesis.
 * SIDE EFFECTS: Will perceive all existing hypotheses on the passed scene,
 * creating the respective groups if they don't exist in the scene, yet. */
Workspace.prototype.getAnyRandomGroup = function(scene, options) {
  options = options || {};
  var aNet = this.attentionNet;
  var self = this;
  // get groups through selectors
  var hyp = this.getRandomHypothesis({filter: function(hyp) {
    var group = hyp.sel.applyToScene(scene);
    return (group && (!options.filter || options.filter(group)));
  }});
  if (!hyp) return null;
  return hyp.sel.getCachedResult(scene);
}

Workspace.prototype.getRandomScene = function() {
  return Random.pick(this.getActiveScenePair());
}

/// You may pass a filter function in the options (ObjectNode->bool).
Workspace.prototype.getRandomObject = function(scene, options) {
  if (!scene) scene = this.getRandomScene();
  return this.attentionNet.getRandomObject(scene, options);
}

/// Pass an object or group node.
Workspace.prototype.getDescription = function(thing) {
  if (thing instanceof ObjectNode) {
    return thing.scene_node.id+":Obj"+thing.obj.id;
  } else if (thing instanceof GroupNode) {
    return thing.scene_node.id+":Grp"+thing.id;
  }
}

Workspace.prototype.describe = function() {
  this.coderack.describe();
}
/// The coderack is an array of codelets. Insert new ones with insert().
/// Call the step() method for running all behaviors and a random codelet
/// chosen based on codelet urgency values.
var Coderack = function(workspace) {
  this.max_length = 50;
  this.behaviors = [];
  this.followups = []; // these are done first and in order
  this.ws = workspace;

  this.cdl_stats = this.createStats();
  this.init();
}
Coderack.prototype = [];

Coderack.prototype.init = function() {
  var self = this;
  this.ws.events.on('switched_scenes', function() {
    var attr_stat = self.cdl_stats[AttrCodelet.prototype.name];
    var check_stat = self.cdl_stats[CheckHypothesisCodelet.prototype.name];
    attr_stat.activity = Math.min(1, Math.max(0.1, attr_stat.activity + 0.1));
    check_stat.activity = Math.min(1, Math.max(0.1, check_stat.activity + 0.1));
  });
}

Coderack.prototype.getCodeletTypeActivity = function(cdl_klass) {
  return this.cdl_stats[cdl_klass.prototype.name].activity;
}

Coderack.prototype.codeletFinished = function(codelet, res) {
  var stat = this.cdl_stats[codelet.name];
  if (res) stat.success++;
  else stat.failure++;
  stat.activity = Math.min(1, Math.max(0.1, stat.activity + (res ? 0.01 : -0.01)));
}

Coderack.prototype.createStats = function() {
  var cdls = [ AttrCodelet, NewHypothesisCodelet, CheckHypothesisCodelet
             , CombineHypothesisCodelet, RecombineHypothesisCodelet];
  var res = {};
  cdls.forEach(function(cdl) {
    res[cdl.prototype.name] = { success: 0, failure: 0, name: cdl.prototype.name
                              , activity: 0.5 } });
  return res;
}

Coderack.prototype.step = function() {
  this.ws.step++;
  this.ws.scene_pair_steps++;
  if (this.followups.length === 0) this.runBehaviors();
  this.runCodelet();
  this.ws.attentionNet.updateActivities(this.ws.scenes);
}

/// Default urgency is 10. Urgency must be above 0.
Coderack.prototype.insert = function(codelet, urgency) {
  codelet.urgency = urgency || 10;
  this.push(codelet);
  this.ws.log(4, 'inserted',codelet.describe(),'with urgency',codelet.urgency);
  // forget the oldest elements if we have too many
  if (this.length > this.max_length) {
    this.splice(0, this.max_length-this.length);
  }
}

Coderack.prototype.describe = function() {
  if (this.length === 0) return 'empty coderack';
  var typeMap = {};
  this.forEach(function (codelet) {
    var type = codelet.name;
    if (type in typeMap) typeMap[type]++;
    else typeMap[type] = 1;
  });
  var str=[];
  for (var type in typeMap) { str.push(type + ": " + typeMap[t]) }
  return 'coderack: ' + str.join(', ');
}

/// Select next codelet based on their urgencies.
Coderack.prototype.select = function() {
  if (this.length === 0) return null;
  return Random.pick_weighted(this, function(c) { return c.urgency });
};

/// Select next codelet based on their urgencies.
Coderack.prototype.select_and_remove = function() {
  if (this.length === 0) return null;
  var idx = Random.weighted(this.map(function(c) { return c.urgency }));
  return this.splice(idx, 1)[0];
};

Coderack.prototype.runBehaviors = function() {
  var thiz = this;
  this.behaviors.forEach(function(behavior) {
    thiz.ws.log(4, 'running', behavior.name);
    behavior.run();
  });
}

Coderack.prototype.runCodelet = function() {
  var cdl;
  if (this.followups.length > 0) {
    this.ws.log(4, 'running followup');
    cdl = this.followups.shift();
  } else {
    if (this.length===0) { this.ws.log(2, 'no codelet to run'); return false }
    cdl = this.select_and_remove();
  }
  this.ws.log(3, 'running', cdl.describe());
  var res = cdl.run();
  this.codeletFinished(cdl, res);

  if (res && cdl.followup && cdl.followup.length > 0) {
    while (cdl.followup.length > 0) this.insert(cdl.followup.shift(), cdl.urgency);
  }
}
/**
 * Chooses an object or a group of objects and then an attribute or
 * relationship which it perceives. It may spawn NewHypothesisCodelets (with
 * the current attribute) and RefineHypothesisCodelets (with the current
 * attribute and a different attribute the same object has).
 */
var AttrCodelet = function(coderack) {
  this.coderack = coderack;
  this.followup = [];
  this.ws = this.coderack.ws;
  this.time = this.ws.getRandomTime();
}

AttrCodelet.prototype.name = 'perceive';

AttrCodelet.prototype.describe = function() {
  return 'AttrCodelet';
}

AttrCodelet.prototype.spawnNewSelCodelet = function (percept, time) {
  this.coderack.insert(new NewHypothesisCodelet(this.coderack, percept, time));
};

AttrCodelet.prototype.isActive = function(percept) {
  return percept.get_activity() > pbpSettings.activation_threshold;
}

AttrCodelet.prototype.perceiveAttr = function(target, feature, time) {
  return target.getDeliberately(feature.prototype.key, {time: time});
}

AttrCodelet.prototype.perceiveRel = function(scene, target_obj, feature, time) {
  if (scene.objs.length < 2) {
    this.ws.blockFeature(feature);
    return;
  }
  var key = feature.prototype.key;
  var other = this.ws.getRandomObject(scene, {filter: function(obj) {
    return obj !== target_obj && !target_obj.getDeliberateOnly(key, { other: obj, time: time });
  }});
  if (!other) return;
  return target_obj.getDeliberately(key, {other: other, time: time});
}

AttrCodelet.prototype.shouldPickFeatureFirst = function() {
  return Math.random() < this.ws.options.perception.pick_feature_first;
}

AttrCodelet.prototype.shouldPickGroup = function() {
  return Math.random() < this.ws.options.perception.pick_group;
}

AttrCodelet.prototype.isNotCachedFeatureFilter = function(node, time) {
  var N = node.scene_node.objs.length;
  return function(feature) {
    var t = (feature.prototype.constant ? 'start' : time);
    if (feature.prototype.arity === 1)
      return !node.getDeliberateOnly(feature.prototype.key, {time: t})
    // we have a relationship, check whether all relationships of given type
    // between node and all the other objects in the scene have been perceived
    return ( node.getDeliberateOnly(feature.prototype.key, { get_all: true, time: t }).length
           < N-1);
  }
}

AttrCodelet.prototype.isNotCachedNodeFilter = function(feature, time) {
  var key = feature.prototype.key;
  time = (feature.prototype.constant ? 'start' : time);
  if (feature.prototype.arity === 1)
    return function(node) {
      return !node.getDeliberateOnly(key, { time: time })
    }
  // we have a relationship, check whether all relationships of given type
  // between node and all the other objects in the scene have been perceived
  return function(node) {
    return ( node.getDeliberateOnly(key, { get_all: true, time: time }).length
           < node.scene_node.objs.length-1);
  }
}

AttrCodelet.prototype.run = function() {
  var scene = this.ws.getRandomScene();
  var target, feature;

  if (this.shouldPickFeatureFirst()) {
    feature = this.ws.getRandomFeature();
    var node_filter = this.isNotCachedNodeFilter(feature, this.time);
    if (feature.prototype.targetType == 'group') {
      target = this.ws.getExistingRandomGroup(scene, { filter: node_filter });
    } else {
      target = this.ws.getRandomObject(scene, { filter: node_filter });
    }
  }
  else { // pick obj or group first
    // use next to line to base group vs. obj feature decision on global param
    // var pick_group = this.shouldPickGroup();
    /// use next two lines to base group vs. obj feature decision on feature activities
    feature = this.ws.getRandomFeature();
    var pick_group = feature.prototype.targetType === 'group';
    target = pick_group ? this.ws.getExistingRandomGroup(scene) : this.ws.getRandomObject(scene);
    if (!target) return false;
    feature = this.ws.getRandomFeature({ type: pick_group ? 'group' : 'obj'
        , filter: this.isNotCachedFeatureFilter(target, this.time) });
  }

  if (!feature || !target) return false;
  var time = (feature.prototype.constant ? 'start' : this.time);
  var percept = (feature.prototype.arity == 1
                ? this.perceiveAttr(target, feature, time)
                : this.perceiveRel(scene, target, feature, time));
  if (percept && percept.get_activity() >= pbpSettings.activation_threshold) {
    this.spawnNewSelCodelet(percept, time);
    return true;
  } else return false;
}
var CheckHypothesisCodelet = function(coderack, hyp) {
  this.coderack = coderack;
  this.ws = this.coderack.ws;
  this.followup = [];
  this.hypothesis = hyp;
}

CheckHypothesisCodelet.prototype.name = 'check hyp';

CheckHypothesisCodelet.prototype.describe = function() {
  return 'CheckHypothesisCodelet';
}

CheckHypothesisCodelet.updateObjectSelectorArrays = function(group, sel) {
  if (sel.is_reference_selector) throw "this should not happen!";
  for (var j=0; j<group.objs.length; j++) {
    var on = group.objs[j].object_node;
    // the following check should be needed for the blank selector only, which
    // is initially applied to all scenes, as all other selectors are only
    // applied once to each scene and their result gets cached
    if (on.selectors.indexOf(sel) !== -1) throw "duplicate selector!";
    on.selectors.push(sel);
  }
}

CheckHypothesisCodelet.prototype.removeFromSelectorArrays = function(sel) {
  var remove_el = function(array, el) {
    var idx = array.indexOf(el);
    if (idx !== -1) array.splice(idx, 1);
  }

  this.ws.forEachScene(function(sn) {
    for (var i=0; i<sn.objs.length; i++) remove_el(sn.objs[i].selectors, sel);
    for (var i=0; i<sn.groups.length; i++) remove_el(sn.groups[i].selectors, sel);
  });
}

CheckHypothesisCodelet.prototype.run = function() {
  var hyp = this.hypothesis;
  var options = this.ws.options;
  var scene_pair_id = this.ws.scene_pair_index;
  if (!hyp) {
    // get a hypothesis that was not matched against the current scene pair yet
    hyp = this.ws.getRandomHypothesis({filter:
      function(sol) {
        return (!sol.wasMatchedAgainst(scene_pair_id))
      }
    });
  }
  if (!hyp) return false;
  this.ws.log(3, 'checking hyp "'+ hyp.describe()+'"');

  var scenes = this.ws.getActiveScenePair();
  var was_pot_sol = hyp.isPotentialSolution();
  var side = hyp.main_side;
  var selected_groups = hyp.checkScenePair(scenes, this.ws.scene_pair_index);

  var is_pot_sol = hyp.isPotentialSolution();
  if (was_pot_sol && !is_pot_sol) {
    if (hyp.adjustThresholds(side, this.ws.left_scenes, this.ws.right_scenes)) {
      this.removeFromSelectorArrays(hyp.sel);
      hyp.reset();
      hyp.sel.cached_results = [];
      selected_groups = hyp.checkScenePair(scenes, this.ws.scene_pair_index);
    }
  }
  this.ws.log(3, 'hyp after checking now is: "'+ hyp.describe()+'"');
  if (hyp.main_side === 'fail') {
    this.removeFromSelectorArrays(hyp.sel);
    return true;
  }
  for (var i=0; i<selected_groups.length; i++) {
    if (selected_groups[i].length > 0 && selected_groups[i].scene_node.groups.indexOf(selected_groups[i]) === -1) throw "this should not happen";
    this.ws.addGroup(selected_groups[i]);
    CheckHypothesisCodelet.updateObjectSelectorArrays(selected_groups[i], hyp.sel);
  }

  if (hyp.isSolution(this.ws.scene_pair_sequence.length)) this.ws.addSolution(hyp);

  return true;
}
/** Will pick two generalizing type selectors and combine them. */
var CombineHypothesisCodelet = function(coderack) {
  this.coderack = coderack;
  this.followup = [];
  this.ws = this.coderack.ws;
}

CombineHypothesisCodelet.prototype.name = 'combine hyp';

CombineHypothesisCodelet.prototype.describe = function() {
  return 'CombineHypothesisCodelet';
}

CombineHypothesisCodelet.prototype.getBlankRelationship = function(sel) {
  var blanks = sel.rels.filter(function(rel) { return rel.other_sel.blank() });
  if (!blanks.length) return null;
  else return Random.pick(blanks);
}

CombineHypothesisCodelet.prototype.run = function() {
  var obj = this.ws.getRandomObject(null, { filter: function(o) { return o.selectors.length >= 2 }});
  if (!obj) return false;
  var hyp_pool = obj.selectors.map(function(sel) { return sel.solution });
  var hyp1 = this.ws.getRandomHypothesis(
    { no_blank: true, pool: hyp_pool, main_side: 'both' }
  );
  if (!hyp1) return false;
  var hyp2 = this.ws.getRandomHypothesis(
    { no_blank: true, pool: hyp_pool, main_side: 'both'
    , filter: function(hyp) {
      return hyp !== hyp1 && hyp.compatibleWith(hyp1)
        && hyp1.sel.merged_with.indexOf(hyp.sel) === -1
        && hyp.sel.merged_with.indexOf(hyp1.sel) === -1 }}
  );
  if (!hyp2) return false;
  var hyp12 = hyp1.mergedWith(hyp2);
  hyp1.sel.merged_with.push(hyp2);
  hyp2.sel.merged_with.push(hyp1);
  if (!hyp12 || hyp12.equals(hyp1) || hyp12.equals(hyp2)) return false;
  if (!this.ws.isNewHypothesis(hyp12)) return false;

  this.coderack.insert(new NewHypothesisCodelet(this.coderack, hyp12));
  return true;
}
/** Will pick a "both" solution with a relationship matcher and swap its target selector. */
var RecombineHypothesisCodelet = function(coderack) {
  this.coderack = coderack;
  this.followup = [];
  this.ws = this.coderack.ws;
}

RecombineHypothesisCodelet.prototype.name = 'recombine hyp';

RecombineHypothesisCodelet.prototype.describe = function() {
  return 'RecombineHypothesisCodelet';
}

RecombineHypothesisCodelet.prototype.getBlankRelationship = function(sel) {
  var blanks = sel.rels.filter(function(rel) { return rel.other_sel.blank() });
  if (!blanks.length) return null;
  else return Random.pick(blanks);
}

RecombineHypothesisCodelet.prototype.cloneDifferentMatchingSelector = function(obj, sel) {
  var hyp = this.ws.getRandomHypothesis({
    type: 'object'
  , filter: function(sol) {
      if (sol.sel.hasRelationships()) return false;
      if (!sol.sel.matchesObject(obj)) return false;
      if (sol.sel.equals(sel)) return false;
      return true;
    }
  });
  return hyp ? hyp.sel.clone() : false;
}

RecombineHypothesisCodelet.prototype.run = function() {
  // get a hypothesis with a relationship
  var hyp = this.ws.getRandomHypothesis(
    { main_side: 'both'
    , filter: function(hyp) { return hyp.sel.hasRelationships() }
    }
  );
  if (!hyp) return false;

  // pick one relationship from the hypothesis and select one object matching its reference selector
  var rel_idx = Random.int(hyp.sel.rels.length);
  var rel = hyp.sel.rels[rel_idx];
  var group = rel.other_sel.applyToScene(this.ws.getRandomScene());
  var obj = this.ws.getRandomObject(null, { pool: group.objs.map(function(o) { return o.object_node }) });
  if (!obj) return false;

  // pick an alternative selector that selects that object
  var new_sel = this.cloneDifferentMatchingSelector(obj, rel.other_sel);
  if (!new_sel) return;

  // create a new hypothesis with the relationship's reference selector replace by the new one
  var new_hyp = hyp.clone();
  var new_rel = new_hyp.sel.rels[rel_idx];
  if (!new_rel) {
    console.log('problem:');
    console.log(hyp.describe(), new_hyp.describe());
    console.log(new_hyp.sel.rels.length, hyp.sel.rels.indexOf(rel));
  }

  new_rel.other_sel = new_sel;
  new_sel.is_reference_selector = true;

  // ensure the new rel-matcher is different from the other rel-matchers
  // e.g., we don't want to get "close any object and close any object"
  for (var i=0; i<new_hyp.sel.rels.length; i++) {
    if (i !== rel_idx && new_hyp.sel.rels[i].equals(new_rel)) return false;
  }

  this.coderack.insert(new NewHypothesisCodelet(this.coderack, new_hyp));
  return true;
}
/**
 * Uses the passed attribute / relationship and side to create the respective
 * hypothesis + selector. Then it applies the hypothesis to the currently active
 * scenes. If all scenes match or only the scenes of one side match, it adds
 * the hypothesis to the global list of hypotheses.
 */
var NewHypothesisCodelet = function(coderack, percept_or_hyp, time) {
  this.coderack = coderack;
  this.followup = [];
  this.ws = this.coderack.ws;
  if (percept_or_hyp instanceof Solution) this.hypothesis = percept_or_hyp;
  else this.percept = percept_or_hyp;
  this.time = time;
}

NewHypothesisCodelet.prototype.name = 'create hyp';

NewHypothesisCodelet.prototype.describe = function() {
  if (this.hypothesis) return 'NewHypothesisCodelet(' + this.hypothesis.describe() + ')';
  else return 'NewHypothesisCodelet(' + this.percept.key + '=' + this.percept.val + ')';
}

NewHypothesisCodelet.prototype.createAttrHyp = function() {
  var time = this.percept.constant ? 'start' : this.time;
  return new Solution((new Selector()).use_attr(this.percept, time));
}

/**
 * We need to construct a selector that matches the target object of the
 * relationship. This is tough in general, so we'll just search through
 * all existing object hypotheses and pick one that matches the target object.
 * If none does, returns null.
 */
NewHypothesisCodelet.prototype.createRelHyp = function() {
  var other = this.percept.other.object_node;
  var other_sel_hyp = this.ws.getRandomHypothesis({
    //no_blank: true
    type: 'object'
  , filter: function(sol) {
      return !sol.sel.hasRelationships() //&& sol.selectsSingleObjects()
          && sol.sel.matchesObject(other)
    }
  });
  //if (!other_sel) other_sel = this.ws.blank_hypothesis;
  if (!other_sel_hyp) return null;
  var other_sel = other_sel_hyp.sel.clone();
  var sol = new Solution((new Selector()).use_rel(other_sel, this.percept, this.time));
  return sol;
}

NewHypothesisCodelet.prototype.mergeBaseSelector = function(hyp) {
  var g = this.percept.group;
  if (g.objs.length < g.scene_node.objs.length) {
    this.ws.log(4, 'perceived group feature based on selector result');
    var sols = g.selectors.map(function(sel) { return sel.solution });
    var base_hyp = this.ws.getRandomHypothesis({ pool: sols });
    hyp.sel = hyp.sel.mergedWith(base_hyp.sel);
  }
}

/**
 * Create hypothesis with the passed percept and apply it to the current
 * scenes. Then add it to the active hypotheses if it matches all scenes
 * or just all scenes from one side.
 */
NewHypothesisCodelet.prototype.run = function() {
  var self = this;

  var hyp = this.hypothesis;
  if (!hyp) {
    if (this.percept.arity === 1) hyp = this.createAttrHyp();
    else hyp = this.createRelHyp();
    if (hyp && this.percept.targetType === 'group') this.mergeBaseSelector(hyp);
  }
  if (!hyp) return false;

  var existing_hyp = this.ws.getEquivalentHypothesis(hyp);
  if (!existing_hyp) {
    this.ws.addHypothesis(hyp, 0); // initial att. will be set by CheckHypCodelet
    this.coderack.insert(new CheckHypothesisCodelet(this.coderack, hyp));
    return true;
  } else if (!existing_hyp.wasMatchedAgainst(this.ws.scene_pair_index)) {
    this.coderack.insert(new CheckHypothesisCodelet(this.coderack, existing_hyp));
  }
  return false;
}
/* jshint laxcomma: true, asi: true */
var PI = PI || {};

/*

Bugs / Problems:
- Adjustment of thresholds does not work for relationship target-selectors. We can't
  get to the selector "left of very small objects"
- ?? the model might never find a solution in a case where it perceived all
  relevant relationships in a scene, constructed the relevant hypotheses, but
  picked the wrong reference selector in each case. Normally the recombine-
  hypothesis action would fix this situation, but it could happen that all
  hypotheses with that relationship already failed

Version 0.7.1
- changed the default value of feature.hyp_base to 100, which practically leads
to using the priors of each features as its estimated probability

Version 0.7.0
- new codelet: RecombineHypothesisCodelet, which changes the target-selector of a
  relationship matcher
- the new action probabilities are:
  perceive: 0.6, check_hyp: 0.25, combine_hyp: 0.1, recombine_hyp: 0.05
✓ Fixes this problem: Once a relationship matcher is created, its target-selector is fixed.
  It can't be updated via a merge action. If during the first observation the target-selectors
  of a relationship are chosen wrong, the algorithm will never find a solution.
- other_sel selectors in rel-matchers are now clones, not references
✓ Fixes this problem: The other_sel in a relationship matcher is a reference to an existing selector.
  When that existing selector changes its selection thresholds, the relationship
  matcher changes but is not updated or reset. It would be preferable if it would
  use a clone of the existing selector.
- fixed bug that would result in wrong solutions -- related to cloning cached results with selectors.

Version 0.6.2
- simulate priming or scaffolding by fixing the priors for
  ✓ features -> set options.features.initial_activation (or use Workspace.setFeaturePrior)
  ✓ hypotheses -> set options.activity.attr_priors and .rel_priors (or use Workspace.setSelectorPrior)
  ✓ times -> set options.activity.time
  ✓ action types -> set options.action_priors
- changed the calculation of hypothesis activity: don't check for base_level_only() anymore
- added prior=1.5 for unstable attribute

Version 0.6.1
- make group selection analog to object selection:
  - prob. of a group to be chosen is the summed prob. of its selectors
  - use "close" and "touches" as priors

Version 0.6.0
- split stability function into stable and unstable features
- added mechanism for adaptive thresholds:
  - scenes keep track of min&max perceived activity per feature and time
  - selectors have a set of adjusted thresholds (per feature)
  - solutions can adjust thresholds to fix a 'both' or 'fail' match result
- improved the top-most feature, it now uses the top-most point instead of center point

Version 0.5.6
- normalize influence of hypothesis on object by number of selected objects
- set addend to object's activation to 0 so now the object activation is set
  completely by the hypothesis activations (the "any object" hypothesis makes
  sure we'll consider all objects)
- when an existing hypothesis is reconsidered after perceiving a new feature,
  it is checked on the current scene pair if it wasn't already
- when combining hypotheses, pick a second one that was not already combined
  with the first one before
- changed ratio for codelet selection to (0.6,0.3,0.1)

Version 0.5.5
- removed left-most and right-most object prior
- don't use single as attribute anymore, it is never used by humans

Version 0.5.4
- randomized order of PBP rows

Version 0.5.3
- disable specificity advantage ==> PBP 26 solved 1/20
                         before ==>        solved 4/20
- changed feature priors: now base level features have high, dynamic features
  have medium and everything else has low priors.
- blank selector now has complexity 1 and base level features (shapes & sizes)
  only add complexity of 0.5
- selects-all-scenes selectors get only increased probability if based on
  base level features (like: "circle", but not "stable object")
- after all the changes above: PBP26 solved 2/20
- made negations in solutions more expensive: add 2^neg_count to the complexity
  if there are any negations

Version 0.5.2
- Perceptions can now be done deliberatively (in which case they lead to
hypotheses). If they are not done deliberatively, they are still cached, but
can be perceived deliberatively later. This way an feature checked through a
hypotheses (not deliberatively) is still available for constructing hypotheses
later.
- first unique, exists and all modes are checked for a potential solution,
the unique and exists are checked again for matching both sides
- one less parameter: when choosing an object or group first, which of those
types is chosen is determined by the activities of all group vs. obj features
- added two new problems:
  - PBP36: 2/20, PBP35: 3/20

Version 0.5.1
- new activity formula for hypotheses
  - [ PBP04': 20/20 185+-155
    , PBP08 : 20/20 108 +-48
    , PBP26 :  3/20]
  ==> PBP08 is sometimes pretty hard since filter-type selectors are higher
  rated now
- fixed ratio for codelet selection (0.45,0.45,0.1)
  - about the same
- new scene switching formula ==> is this any better???
  - about the same
- object priors based on interesting features
  - about the same, but PBP26: 7 of 20
- feature group activity spreading
  - about the same (even fixed uniform activity among all features is only
    slightly worse) ==> I might need to look at problems where features need
    to be combined!
  - ==> disabled again

Version 0.5.0
- switching to a probability-inspired attention system without annealing or clamping
- AttentionNet.updateActivities() calculates and normalized all activities and
is called once after each codelet run.
- we don't cache the perception results from CheckHypothesis calls anymore (we
need to perceive attributes in the AttrCodelet so that a hypothesis can be constructed
from them)
- Problems with this version
  - almost correct LR-hypotheses are too strong compared to new L/R and
    LR-matches all hypotheses and also make scene switching slow
  - it is questionable why we should activate features of existing hypotheses,
    since these will be checked for by the hypothesis anyways (see PBP08 case
    above, though)
  - [ PBP04': 16/20 310+-370
    , PBP08 : 20/20 159+-168
    , PBP26 :  7/20]

Version 0.4.7
- switched off unique and all solution modes

Version 0.4.6
- don't perceive all hypotheses automatically on each new scene to pick a group,
instead, pick only among existing groups
- selectors now automatically add their perceived groups to the scene's groups
array (and merge with an existing group if it contains the same objects)

Version 0.4.5
- set pick_feature_first probability to 0 by default
- prevent "no codelet to run" steps

Version 0.4.4
- bugfix: no longer accepts hypotheses as solutions before they were tested
  on all scenes

Version 0.4.3
- bugfixes
- separate values for initial and consequitive attention update for selectors

Version 0.4.2
- We don't use solution codelets anymore. Instead, we keep track of which
left and right scenes each selector fits and if they all fit, its a solution!

Version 0.4.1
- shifting attention between scenes in a fixed scheme
- fixed a-priori probabilities for looking at start and end time
- instead of scaling to normalize attention values, we simply clamp them now
- don't set attention values directly, but only increase / decrease them in steps
- cooldown for all attention values

Version 0.4.0
- adding in attention mechanism for selectors:
  - initialize with attention value based on number of scenes matching
- adding in attention mechanism for objects:
  - spread attention from selectors to selected objects
  - add attention to objects with certain attributes (like moves)
  - add attention to objects in certain relationships (like hits)
  - spread attention from selectors to used features


PBP  2: [CountAttribute]
PBP  4: [ShapeAttribute]
PBP  8: [StabilityAttribute]
PBP 11: [CloseAttribute]
PBP 12: [OnTopRelationship, SmallAttribute]
PBP 13: [CountAttribute, OnGroundAttribute]
PBP 16: [RightRelationship, LeftRelationship, ShapeAttribute]
PBP 18: [TouchAttribute, TouchRelationship]
PBP 20: [SupportsRelationship, ShapeAttribute]
PBP 22: [HitsRelationship, CollidesRelationship]
PBP 26: [ShapeAttribute, LeftAttribute]
PBP 31: [MovableUpAttribute, ShapeAttribute]
*/
var pi_version = '0.7.1';
var pi_default_options = function() {
  var low = 0.1, mid = 0.2, high = 0.3;
  return {
    version: pi_version
  , features: [
                { klass: CircleAttribute,      initial_activation: high,  group: 'shape' }
               , { klass: SquareAttribute,      initial_activation: high,  group: 'shape' }
              , { klass: TriangleAttribute,    initial_activation: high,  group: 'shape' }
              , { klass: RectangleAttribute,   initial_activation: high,  group: 'shape' }
              , { klass: SmallAttribute,       initial_activation: high,  group: 'shape' }
              , { klass: LargeAttribute,       initial_activation: high,  group: 'shape' }
                //, { klass: ShapeAttribute,       initial_activation: high, group: 'shape' }
              , { klass: MovesAttribute,       initial_activation: mid, group: 'dynamics' }
              , { klass: UnstableAttribute,    initial_activation: mid, group: 'dynamics' }
              , { klass: StableAttribute,      initial_activation: mid, group: 'dynamics' }
              , { klass: SingleAttribute,      initial_activation: low, group: 'distance' }
              , { klass: TouchRelationship,    initial_activation: low, group: 'distance' }
              , { klass: CountAttribute,       initial_activation: low,  group: 'shape' }
              , { klass: CloseAttribute,       initial_activation: low,  group: 'distance' }
              , { klass: CloseRelationship,    initial_activation: low,  group: 'distance' }
              , { klass: TopMostAttribute,     initial_activation: low,  group: 'vert-pos' }
                // , { klass: LeftMostAttribute,    initial_activation: low,  group: 'hor-pos' }
                // , { klass: RightMostAttribute,   initial_activation: low,  group: 'hor-pos' }
              , { klass: FarRelationship,      initial_activation: low,  group: 'distance' }
              , { klass: FarAttribute,         initial_activation: low,  group: 'distance' }
              , { klass: OnTopRelationship,    initial_activation: low,  group: 'vert-pos' }
              , { klass: OnGroundAttribute,    initial_activation: low,  group: 'vert-pos' }
              , { klass: RightRelationship,    initial_activation: low,  group: 'hor-pos' }
              , { klass: LeftRelationship,     initial_activation: low,  group: 'hor-pos' }
              , { klass: AboveRelationship,    initial_activation: low,  group: 'vert-pos' }
              , { klass: BelowRelationship,    initial_activation: low,  group: 'vert-pos' }
              , { klass: BesideRelationship,   initial_activation: low,  group: 'hor-pos' }
              , { klass: BottomAttribute,      initial_activation: low,  group: 'vert-pos' }
              , { klass: TopAttribute,         initial_activation: low,  group: 'vert-pos' }
              , { klass: TouchAttribute,       initial_activation: low,  group: 'distance' }
              , { klass: SupportsRelationship, initial_activation: low,  group: 'dynamics' }
              , { klass: HitsRelationship,     initial_activation: low,  group: 'dynamics' }
              , { klass: GetsHitRelationship,     initial_activation: low,  group: 'dynamics' }
              , { klass: CollidesRelationship, initial_activation: low,  group: 'dynamics' }
              , { klass: LeftAttribute,        initial_activation: low,  group: 'hor-pos' }
              , { klass: RightAttribute,       initial_activation: low,  group: 'hor-pos' }
              , { klass: MovableUpAttribute,   initial_activation: low,  group: 'dynamics' }
             ]
  , pres_mode: 'interleaved-sim-dis' // {blocked, interleaved} X b/w{sim, dis} X w/i{sim, dis}
  , randomize_row_order: false
  , action_priors:
    {
      perceive: 0.6
    , check_hyp: 0.25
    , combine_hyp: 0.1
    , recombine_hyp: 0.05
    }
  , perception:
    {
      pick_feature_first: 0.5 // probability that the feature (vs. the target) is
                              // picked first during perception
    }
  , activity:
    {
        time: { start: 0.67, end: 0.33 }
      , feature: {
        hyp_base: 100 // >=0, the smaller, the bigger the influence of hypotheses activities
      }
      , obj: {
          hyp_base: 0 // >=0, the smaller, the bigger the influence of hypotheses activities
        , attr_priors: { // only apply at time "start"
            moves: 2
          , unstable: 1.5
            // should we include stability->unstable?
          , top_most: 1.5 // this & below: often will get boosted via sel.specificity, too
          // , single: 1.5
          //, left_most: 1.25
          //, right_most: 1.25
        }
      }
      , group: {
          hyp_base: 0
        , attr_priors: {
            touching: 1.5
          , close: 1.25
          }
        }
      , selector: {
        attr_priors: {
        }
      , rel_priors: {
        }
      }
    }
  };
}

PI[pi_version.replace(/\./g, '_')] = (function(opts) {
  var version = pi_version;

  var options = opts || pi_default_options();

  var createWorkspace = function(scenes, loglevel) {
    var ws = new Workspace(scenes, options, loglevel);
    ws.coderack.behaviors.push(new MainBehavior(ws.coderack));
    return ws;
  }

  /// Will create Attr-, NewHypothesis-, RefineHypothesis-, and SolveCodelets. What is created
  /// next will depend on a "mindset" value: 0 is complete explore and 1 complete exploit
  /// behavior. For now it just creates one of the four codelet types with a preset and fixed
  /// probability.
  var MainBehavior = function(coderack, attrs) {
    this.cr = coderack;
    this.ws = coderack.ws;
    this.name = 'MainBehavior';
    this.codelet_infos = [{klass: AttrCodelet, attention: options.action_priors.perceive }
                         ,{klass: CheckHypothesisCodelet, attention: options.action_priors.check_hyp }
                         ,{klass: CombineHypothesisCodelet, attention: options.action_priors.combine_hyp }
                         ,{klass: RecombineHypothesisCodelet, attention: options.action_priors.recombine_hyp }];
    this.att_getter = function(ci) {
      return ci.attention// * coderack.getCodeletTypeActivity(ci.klass)
    };
  }

  MainBehavior.prototype.updateAttentions = function() {
    var hyps = this.ws.attentionNet.solutions;
    var checked_lr_max = 0, unchecked_sum = 0; // max attention among respective solutions
    var expl_sum = 0;
    for (var i=0; i<hyps.length; i++) {
      var hyp = hyps[i];
      var was_checked = hyp.wasMatchedAgainst(this.ws.scene_pair_index);
      var val = this.ws.attentionNet.getActivity(hyp);
      if (hyp.main_side === 'both' && was_checked) checked_lr_max = Math.max(checked_lr_max, val);
      if (!was_checked) unchecked_sum += val;
      if (was_checked && (hyp.main_side === 'left' || hyp.main_side === 'right')) {
        expl_sum += val;
      }
    }
    // this.codelet_infos[0].attention = 0.6;
    // this.codelet_infos[1].attention = 0.3;//unchecked_sum;//0.3//1-(1/Math.pow(2, 3*unchecked_sum));
    // this.codelet_infos[2].attention = 0.1;//checked_lr_max/2;//0.1//Math.max(0, 1-(1/Math.pow(2, 2*checked_lr_max)));
    this.expl_sum = expl_sum;
    this.unchecked_sum = unchecked_sum;
  }

  MainBehavior.prototype.getTopDownAttention = function(cdl_name) {
    var ci = this.codelet_infos.filter(function(ci) {
      return ci.klass.prototype.name === cdl_name
    })[0];
    if (ci) return ci.attention;
    else return 0;
  }

  MainBehavior.prototype.getBottomUpAttention = function(cdl_name) {
    var ci = this.codelet_infos.filter(function(ci) {
      return ci.klass.prototype.name === cdl_name
    })[0];
    if (ci) return this.cr.getCodeletTypeActivity(ci.klass);
    else return 0;
  }

  MainBehavior.prototype.getCombinedAttention = function(cdl_name) {
    var ci = this.codelet_infos.filter(function(ci) {
      return ci.klass.prototype.name === cdl_name
    })[0];
    if (ci) return this.att_getter(ci);
    else return 0;
  }

  MainBehavior.prototype.run = function() {
    if (this.cr.length > 0) return;
    this.updateAttentions();
    //console.log('before:', 1/this.expl_sum, 'now:', (this.expl_sum+this.unchecked_sum)/this.expl_sum);
    //if (this.ws.scene_pair_steps > Math.min(100, 1/this.expl_sum)) {
    var norm = this.expl_sum+this.unchecked_sum || 1;
    if (this.ws.scene_pair_steps > Math.min(100, norm/this.expl_sum)) {
      this.ws.advanceScenePair();
      this.updateAttentions();
    }
    var codelet_info = Random.pick_weighted(this.codelet_infos, this.att_getter);
    this.cr.insert(new codelet_info.klass(this.cr));
  }

  return { createWorkspace: createWorkspace
         , options: options
         , version: version
         };
});
/** Testing
scenes = []; for (p in problems) scenes.push(problems[p].sn);
var t = new PITester(PI.v0_2_1, scenes, 1, 1000, 1, false);
t.run();
*/

/// Used to test how well a problem is solved by the passed physics interpreter. You
/// can pass 'current' as pi and the tester will pick the newest pi from the PI object,
/// automatically.
/// Set the before_step_callback, after_step_callback, start_callback, finish_callback can all
/// be set to functions.
PITester = function(pi, scenes, reps, max_steps, max_sols, log_level) {
	this.pi = (pi=='current' ? PITester.get_current_pi()() : pi);
	this.scenes = scenes;
	this.reps = reps || 1;
	this.curr_rep = 0;
	this.curr_step = 0;
	this.res = [];
	this.ws = null;
	this.max_steps = max_steps || 1000;
	this.max_sols = max_sols || 1;
	this.log_level = log_level || 0;
	this.after_step_callback = null;
	this.after_rep_callback = null;
	this.before_step_callback = null;
	this.start_callback = null;
	this.finish_callback = null;
	this.auto_next = false;
	this.auto_next_delay = 0;
	this.next_timer = null;
	this.initNextRep();
}

PITester.prototype.reset = function() {
	this.res = [];
	this.curr_rep = 0;
	this.curr_step = 0;
	this.ws = null;
	this.initNextRep();
}

PITester.prototype.initNextRep = function() {
	this.curr_rep++;
	this.curr_step = 0;
	this.clear_scenes();
	this.ws = this.pi.createWorkspace(this.scenes, this.log_level);
	if (this.logCallback) this.ws.logCallback = this.logCallback;
	if (this.start_callback) this.start_callback();
	console.log('run',this.curr_rep,'of',this.reps);
}

PITester.prototype.run = function() {
	this.auto_next = true;
	this.step();
}

PITester.prototype.pause = function() {
	if (this.next_timer) clearTimeout(this.next_timer);
	this.auto_next = false;
}

PITester.prototype.isRepFinished = function() {
	return (this.curr_step === this.max_steps
	       || this.ws.solutions.length >= this.max_sols);
}

PITester.prototype.step = function() {
	if (!this.ws || this.isRepFinished()) this.initNextRep();

	// do a step
	if (this.before_step_callback) this.before_step_callback(this.curr_step, this.max_steps);
	this.ws.coderack.step();
	this.curr_step++;
	if (this.after_step_callback) this.after_step_callback(this.curr_step, this.max_steps);

	// are we done with the current repetition?
	if (this.isRepFinished()) {
		// save current result
		var curr_res = {rep: this.curr_rep, steps: this.curr_step-1};
	  curr_res.perception_count = this.ws.perception_count;
	  curr_res.retrieval_count = this.ws.retrieval_count;
	  curr_res.sols = this.ws.solutions;
	  if (this.max_sols === 1) curr_res.sol = this.ws.solutions[0];
	  curr_res.solved = this.ws.solutions.length > 0;
	  curr_res.reps = this.reps;
	  this.res.push(curr_res);
	  if (this.after_rep_callback) this.after_rep_callback(curr_res.solved, this.curr_rep, this.reps);
	  // are we finished?
	  if (this.curr_rep === this.reps) {
	  	if (this.finish_callback) this.finish_callback();
	  	return this.show_stats();
	  }
	}
	// next step
	if (this.auto_next) this.next_timer = setTimeout(this.step.bind(this, true), this.auto_next_delay);
}

PITester.prototype.setLogCallback = function(cb) {
	this.logCallback = cb;
	if (this.ws) this.ws.logCallback = this.logCallback;
}

PITester.prototype.get_stats = function() {
	var stats = { };
	var res = this.res;
	stats.pi_version = this.pi.version;
	stats.runs = res.length;
	stats.solved = res.filter(function(r) { return r.solved }).length;
	stats.solutions = [];
	for (var i=0; i<res.length; i++) {
		var sol = res[i].sols[0];
		if (!sol) continue;
		var sol_descr = sol.describe();
		var same_sol = stats.solutions.filter(function(sinfo) {
		  return sinfo.sol === sol_descr
		})[0];
		if (same_sol) same_sol.count++;
		else stats.solutions.push({sol: sol_descr, count: 1});
	}

	var calc_stat = function(name) {
		var stat = {name: name};
		var ext = d3.extent(res, function(d) {return d[name]});
		var avg = d3.mean(res, function(d) {return d[name]});
		var avg_square = 0;
		for (var j=0; j<res.length; j++) {
			avg_square += res[j][name] * res[j][name];
		}
		avg_square /= res.length;
		var std_dev = Math.sqrt(avg_square - avg*avg);
		stat.min = ext[0]; stat.max = ext[1];
		stat.avg = avg; stat.std_dev = std_dev;
		return stat;
	}

	stats.trials = this.res;
	stats.steps = calc_stat('steps');
	stats.perception_count = calc_stat('perception_count');
	stats.retrieval_count = calc_stat('retrieval_count');

	return stats;
}

PITester.prototype.show_stats = function() {
	var stats = this.get_stats();
	console.log('PI v'+stats.pi_version, 'solved', stats.solved, 'of', stats.runs);
	for (var key in stats) {
		if (!stats[key].std_dev) continue;
		var s = stats[key];
		console.log( key + ':', s.avg.toFixed(0), '+-' + s.std_dev.toFixed(1)
			         , 'min=' + s.min, 'max=' + s.max );
	}
	// var sum=0;
	// for (var i=0; i<res.length; i++) if (res[i].solved) sum++;
	// console.log('PI v'+this.pi.version, 'solved', sum, 'of', res.length);

	// var stats = function(/*args*/) {
	// 	for (var i=0; i<arguments.length; i++) {
	// 	 	var name = arguments[i];
	// 		var ext = d3.extent(res, function(d) {return d[name]});
	// 		var avg = d3.mean(res, function(d) {return d[name]});
	// 		var avg_square = 0;
	// 		for (var j=0; j<res.length; j++) {
	// 			avg_square += res[j][name] * res[j][name];
	// 		}
	// 		avg_square /= res.length;
	// 		var std_dev = Math.sqrt(avg_square - avg*avg);
	// 		console.log(name + ': ' + avg.toFixed(0) + ' +-' + std_dev.toFixed(1)
	// 		          + ' min=' + ext[0] + ' max=' + ext[1]);
	// 	}
	// }
	// stats('steps', 'perception_count', 'retrieval_count');
	// return res;
}

PITester.prototype.clear_scenes = function() {
	this.scenes.forEach(function (s) {
		s.groups = [];
		s.objs.forEach(function (o) {
			o.times.start = {};
			o.times.end = {};
			o.selectors = [];
		});
	});
}

PITester.get_current_pi = function() {
	var curr = d3.keys(PI).reduce(function(a,b) { return a>b ? a : b});
	return PI[curr];
}

/// Pass the html table element and the tester will use d3 to
/// bind & update it with the selector data from the current pi.
PITester.prototype.updateHypothesisTable = function(table_el, clickCallback) {
	var selectors = this.ws ? this.ws.getHypothesisInfoArray() : [];

	var trs = d3.select(table_el)
	  .selectAll('tr')
	  .data(selectors)
	  .sort(function(a, b) { return b.val-a.val });

	var side_str = { 'both': 'LR', 'left': 'L', 'right': 'R', 'fail': '--'};
	var mode_str = { 'all': 'A', 'exists': 'E', 'unique': '1'};

	trs.enter().append('tr');
	trs.exit().remove();
	var tds = trs
		.on('click', function(info) {	clickCallback(info.src) })
		.style('color', function(d) { return d.val === 0 ? 'silver' : 'black' })
	  .selectAll('td')
	  .data(function(d) { return [ side_str[d.src.main_side]
	  	                         , mode_str[d.src.mode]
	  	                         , d.src.sel.describe()
	  	                         //, d.src.sel.getComplexity()
	  	                         , d.src.checks.left+d.src.checks.right
	  	                         , d.val.toFixed(2)] })

	tds.enter().append('td');
	tds.exit().remove();
	tds.text(function(d) { return d });
}

PITester.prototype.updateFeatureList = function(div_el, click_callback) {
	var features = this.ws ? this.ws.getFeatureInfoArray() : [];

	var divs = d3.select(div_el)
	  .selectAll('.feature')
	  .data(features);

	var enter = divs.enter()
		.append('div')
	    .classed('feature', true)
	if (click_callback) enter.on('click', function(d) { click_callback(d.src) });
	enter.append('div')
		.classed('key', true)
	  .text(function(d) { return d.key.split('_').join(' ') });
	enter.append('div')
	  .classed('val', true);

	// divs.style('background-color', function(d) { return 'rgba(0,0,0,'+d.val/2+')' });
	var max = d3.max(features, function(d) { return d.val });
	divs.style('background', function(d) { return 'rgba(140,140,140,'+d.val/max+')' });
	divs.select('.val').text(function(d) { return d.val.toFixed(2) });

	divs.exit().remove();
}

PITester.prototype.updateCodeletStats = function(div_el, simple) {
	var stats = this.ws ? d3.values(this.ws.coderack.cdl_stats) : [];
	var behavior = this.ws.coderack.behaviors[0];

	var ps = d3.select(div_el)
	  .selectAll('.stat')
	  .data(stats);

	var enter = ps.enter().append('span').classed('stat', true);
	if (simple) {
		ps.text(function(d) {
			var prob = behavior.getCombinedAttention(d.name);
			return d.name + (prob ? ' [' + prob.toFixed(2) + ']: ' : ': ') + (d.success+d.failure);
		});
	} else {
		ps.text(function(d) { return d.name + ': ' + d.success + '/' + (d.success+d.failure)
                               + ' [' + behavior.getCombinedAttention(d.name).toFixed(2) + ']    '});
	}
	ps.exit().remove();
}

PITester.prototype.getActiveScenes = function() {
	return this.ws ? this.ws.getActiveScenePair() : [];
}

PITester.prototype.updateSolutionList = function(list_el) {
	if (!list_el) return;
	var solutions = this.ws ? this.ws.solutions : [];

	var divs = d3.select(list_el)
	  .selectAll('.solutions')
	  .data(solutions);

	divs.enter()
	  .append('li')
	  .text(function(d) { return d.describe() });

	divs.exit().remove();
}

PITester.prototype.updateLastSolution = function(el) {
	if (!el) return;
	var solutions = this.ws ? this.ws.solutions : []
	  , N = solutions.length;

	d3.select(el).text(N ? solutions[N-1].describe() : '');
}
PITestSuite = function(repetitions, max_solver_steps) {
	this.pbps = [ "pbp02", "pbp04", "pbp08", "pbp11b", "pbp12", "pbp13"
              , "pbp16", "pbp18", "pbp20", "pbp22", "pbp26", "pbp30", "pbp31"
              , "pbp35", "pbp36" ];
	this.parameters = [{name: 'pbp', values: this.pbps}];
	this.reps = repetitions || 1;
	this.max_solver_steps = max_solver_steps || 1000;
	this.scene_cache = {}; // pbp -> [scenes]
	this.results = [];
  this.data_logger = null;
  this.before_step_callback = null;
  this.after_step_callback = null;
  this.progress_callback = null;
  this.log_error_callback = null;
  this.id = Random.uid();
}

PITestSuite.prototype.setLogServer = function(url, table_name) {
  var self = this;
  this.data_logger = { log: function(data, table) {
    d3.xhr(url+'/'+(table||table_name))
      .header("Content-Type", "application/json")
      .post(JSON.stringify(data), function(error, data) {
        if (error) console.log('log server error: ', error);
        if (error && self.log_error_callback) self.log_error_callback(error);
    })
  }}
}

PITestSuite.prototype.addParameter = function(name, values) {
  if (name === 'pbp') this.parameters[0] = {name: name, values: values};
	else this.parameters.push({name: name, values: values, i: 0});
}

PITestSuite.prototype.setParameter = function(name, values) {
  var p = this.parameters.filter(function(param) { return param.name === name });
  if (p.length === 0) throw 'unknown parameter ' + name;
  p[0].values = values;
  p[0].i = 0;
}

PITestSuite.prototype.run = function(start_idx, end_idx, custom_feature_list) {
  var param_settings = this.cartesianProduct(this.parameters);
  this.step_count = param_settings.length;
  var i = start_idx || 0, self = this;
  function step() {
    if (i >= param_settings.length || i >= end_idx) {
      setTimeout(function() {console.log("ALL DONE!")}, 100);
      return;
    }
    var params = param_settings[i++];
    self.curr_idx = i;
    var options = pi_default_options();
    if (custom_feature_list) options.features = custom_feature_list;
    var pbp = null;
    for (var j=0; j<params.length; j++) {
      if (params[j].name === 'pbp') pbp = params[j].value;
      else if (params[j].name === 'feature_count') {
        options.features = options.features.slice(0,params[j].value);
      }
      else self.applyParam(options, params[j]);
    }
    if (self.before_step_callback) self.before_step_callback(i, param_settings.length, params);
    console.log('running test', i, 'of', Math.min(param_settings.length, end_idx), 'with', params.map(function(param) {
      return param.name+': '+param.value;
    }).join(', '));
    self.runOne(pbp, options, params, step);
  }
  step();
}

PITestSuite.prototype.applyParam = function(options, param) {
  var path = param.name.split('.')
    , N = path.length;
  for (var i=0; i<path.length-1; i++) options = options[path[i]];
  if (!(path[N-1] in options)) throw "ERROR: " + param.name + " does not match any known option!";
  options[path[N-1]] = param.value;
}

PITestSuite.prototype.runOne = function(pbp, options, params, callback) {
  var scenes = this.getScenes(pbp);
  var pi = PITester.get_current_pi()(options);

  var tester = new PITester( pi, scenes, this.reps, this.max_solver_steps
                           , 1, 'error');
  var self = this;
  tester.finish_callback = function() {
    console.log('finished!');
    var stats = tester.get_stats();
    self.logResult(options, params, stats);
    if (self.after_step_callback) self.after_step_callback(params, stats);
    callback();
  };
  tester.after_rep_callback = this.progress_callback;
  tester.run();
}

PITestSuite.prototype.logResult = function(opts, params, stats) {
  opts.features = opts.features.map(function(fi) {
    return { key: fi.klass.prototype.key
           , targetType: fi.klass.prototype.targetType
           , initial_activation: fi.initial_activation }
  });
  var res = { trial_curr: this.curr_idx
            , trial_total: this.step_count
            , steps_max: this.max_solver_steps
            , test_id: this.id
            , options: opts };
  var dot = /\./g;
  params.forEach(function(param) {
    var name = param.name.replace(dot, '->'); // we can't use dots in mogodb names
    res[name] = param.value
  });
  for (var trial_idx in stats.trials) {
    var data = {};
    PBP.extend(data, res);
    PBP.extend(data, stats.trials[trial_idx]);
    data.sol = data.sol ? data.sol.describe() : '';
    delete data.sols;
    this.results.push(data);
    if (this.data_logger) this.data_logger.log(data);
  }
}

PITestSuite.prototype.cartesianProduct = function(params) {
	var results = [];
	function recurse(arr_in, arr_out) {
		if (arr_in.length === 0) { results.push(arr_out); return }
		for (var i=0; i<arr_in[0].values.length; i++) {
		  var out = arr_out.slice();
		  out.push({name: arr_in[0].name, value: arr_in[0].values[i]});
		  recurse(arr_in.slice(1), out);
		}
	}
	recurse(params, []);
	return results;
}

PITestSuite.prototype.getScenes = function(pbp) {
	if (!this.scene_cache[pbp]) this.scene_cache[pbp] = this.loadScenes(pbp);
	return this.scene_cache[pbp];
}

PITestSuite.prototype.loadScenes = function(pbp) {
	var path = "../../libs/pbp-svgs/svgs/" + pbp;
	var files = ['1-1', '1-2', '1-3', '1-4'
                    ,'2-1', '2-2', '2-3', '2-4'
                    ,'3-1', '3-2', '3-3', '3-4'
                    ,'4-1', '4-2', '4-3', '4-4'
                    ,'5-1', '5-2', '5-3', '5-4'];
	var scenes = [];
  var adapter = new Box2DAdapter();
  for (var i=0; i<files.length; i++) {
  	var scene = SVGSceneParser.parseFile(path + "/" + files[i] + '.svg', pixels_per_unit);
    // quick hack to extract side from the file name
    if (files[i].split('-').length == 2 && Number(files[i].split('-')[1]) >= 3) {
      scene.side = 'right';
    } else scene.side = 'left';
    scene.name = files[i];

    scene.adjustStrokeWidth(0.5*pixels_per_unit/100);

    // create b2World
    var world = new Box2D.Dynamics.b2World(new Box2D.Common.Math.b2Vec2(0, 10), true);
    scene.friction = 0.3;
    scene.resitution = 0.1;
    adapter.loadScene(world, scene, true, false);

    // create PhysicsScene, Simulator and SceneNode with PhysicsOracle
    var ps = new PhysicsScene(world);
    var sn = new SceneNode(scene, new PhysicsOracle(ps));
    sn.registerObjects();
  	sn.perceiveCollisions();

  	scenes.push(sn);
  }
  return scenes;
}
var pixels_per_unit = 50
  , div, p, t;

function init(from, to, db_suffix) {
	var ps = setup_testsuite(25, 2500, db_suffix);
	// var ps = setup_testsuite(2, 250);
	ps.addParameter('pres_mode',
		['interleaved-sim-sim', 'interleaved-sim-dis'
		,'interleaved-dis-sim', 'interleaved-dis-dis'
	  ,'blocked-sim-sim', 'blocked-sim-dis'
		,'blocked-dis-sim', 'blocked-dis-dis']);
	ps.addParameter('activity.feature.hyp_base', [0.1, 100]);
	ps.run(from || 0, to || Infinity);
}

var low = 0.1, mid = 0.2, high = 0.3;
var feature_list = 
[
    { klass: CircleAttribute,      initial_activation: high,  group: 'shape' }
  , { klass: RightRelationship,    initial_activation: low,  group: 'hor-pos' }
  , { klass: LeftRelationship,     initial_activation: low,  group: 'hor-pos' }
  , { klass: TouchAttribute,       initial_activation: low,  group: 'distance' }
  , { klass: SquareAttribute,      initial_activation: high,  group: 'shape' }
  , { klass: FarRelationship,      initial_activation: low,  group: 'distance' }
  , { klass: TriangleAttribute,    initial_activation: high,  group: 'shape' }
  , { klass: CloseRelationship,    initial_activation: low,  group: 'distance' }
  , { klass: RectangleAttribute,   initial_activation: high,  group: 'shape' }
  , { klass: TouchRelationship,    initial_activation: low, group: 'distance' }
  , { klass: SmallAttribute,       initial_activation: high,  group: 'shape' }
  , { klass: HitsRelationship,     initial_activation: low,  group: 'dynamics' }
  , { klass: MovesAttribute,       initial_activation: mid, group: 'dynamics' }
  , { klass: GetsHitRelationship,  initial_activation: low,  group: 'dynamics' }
  , { klass: FarAttribute,         initial_activation: low,  group: 'distance' }
  , { klass: CollidesRelationship, initial_activation: low,  group: 'dynamics' }
  , { klass: AboveRelationship,    initial_activation: low,  group: 'vert-pos' }
  , { klass: CountAttribute,       initial_activation: low,  group: 'shape' }
  , { klass: BelowRelationship,    initial_activation: low,  group: 'vert-pos' }
  , { klass: CloseAttribute,       initial_activation: low,  group: 'distance' }
  , { klass: TopMostAttribute,     initial_activation: low,  group: 'vert-pos' }
  , { klass: LargeAttribute,       initial_activation: high,  group: 'shape' }
  , { klass: OnTopRelationship,    initial_activation: low,  group: 'vert-pos' }
  , { klass: OnGroundAttribute,    initial_activation: low,  group: 'vert-pos' }
  , { klass: BesideRelationship,   initial_activation: low,  group: 'hor-pos' }
  , { klass: BottomAttribute,      initial_activation: low,  group: 'vert-pos' }
  , { klass: TopAttribute,         initial_activation: low,  group: 'vert-pos' }
  , { klass: SupportsRelationship, initial_activation: low,  group: 'dynamics' }
  , { klass: LeftAttribute,        initial_activation: low,  group: 'hor-pos' }
  , { klass: RightAttribute,       initial_activation: low,  group: 'hor-pos' }
  , { klass: UnstableAttribute,    initial_activation: mid, group: 'dynamics' }
  , { klass: StableAttribute,      initial_activation: mid, group: 'dynamics' }
  , { klass: MovableUpAttribute,   initial_activation: low,  group: 'dynamics' }
  , { klass: SingleAttribute,      initial_activation: low, group: 'distance' }
];

function init_O(from, to, db_suffix) {
	var ps = setup_testsuite(25, 2500, db_suffix);
	ps.addParameter('feature_count', [3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]);
	ps.addParameter('pbp', ['pbp26']);
	ps.run(from || 0, to || Infinity, feature_list);	
}

function init_ff(idx) {
	var ps = setup_testsuite(75, 2000);
	//ps.setParameter('pbp', ['pbp13']);
	ps.addParameter('pres_mode',
		['interleaved-sim-sim', 'interleaved-sim-dis'
		,'interleaved-dis-sim', 'interleaved-dis-dis'
	    ,'blocked-sim-sim', 'blocked-sim-dis'
		,'blocked-dis-sim', 'blocked-dis-dis']);
	ps.addParameter('perception.pick_feature_fist', [0, 0.5, 1]);
	ps.run(idx || 0);
}

function setup_testsuite(reps, max_steps, db_suffix) {
	console.log('initializing...');
	div = d3.select('div#log');
	var ps = new PITestSuite(reps, max_steps);
	ps.setLogServer('http://localhost:3000', 'pi_'+pi_version.replace(/\./g, '_')+(db_suffix||''));
	//ps.before_step_callback = show_step;
	//ps.after_step_callback = show_res;
	ps.progress_callback = show_progress;
	ps.log_error_callback = log_error;
	t = Date.now();
	return ps;
}

function log_error(error) {
	console.log('LOGGING ERROR!', error);
	// div.append('p')
	//   .text('LOGGING ERROR!')
	//   .style({'font-size': '25px', 'color': 'red', 'font-weight': 'bold'})
}

function show_step(i, N, params) {
	pstr = params.map(function(param) {
    return param.name+'="'+param.value+'"';
  }).join(', ');

	console.log('step '+i+' of '+N+' with parameters '+ pstr);
	// p = div.append('p')
	//   .html('step '+i+' of '+N+' with parameters '+ pstr + '<br/>')
	//   .style('word-wrap', 'break-word');
}

function show_progress(solved, i, N) {
	console.log((solved ? 'OK' : 'FAIL') + ' in ' + ((Date.now()-t)/1000).toFixed(1) + ' sec');
	t = Date.now();
	//p.append('span').text(solved ? '✓' : '✗').style('color', solved ? 'green' : 'red');
}

function show_res(params, stats) {
	console.log('solved: ' + stats.solved + '/' + stats.runs);
	//p.html(p.html() + '<br/>  solved: ' + stats.solved + '/' + stats.runs
	//       + '  steps: ' + Math.round(stats.steps.avg)
	//       + ' +-' + Math.round(stats.steps.std_dev));
}
