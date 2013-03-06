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

  /// Loads the shapes in the scene from the contents of an svg file (passed as string)
  var parseFile = function(file_url) {
    //console.log('parsing', file_url);
    var content = ajaxGetUrl(file_url);
    var svg_dom = parseXml(content);
    if (!svg_dom) throw 'Error parsing ' + content;

    // WORKAROUND 1
    // normally we would use the svg dom tree directly, but due to this bug in Firefox
    // (https://bugzilla.mozilla.org/show_bug.cgi?id=756985),
    // we need to add it to the main dom tree if we want to use getCTM() dom function.
    var root = append_svg_to_dom(svg_dom, "hidden_svg_div");
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

    var paths = root.getElementsByTagName('path');
    for (var i=0; i<paths.length; i++) {
      var path_node = paths[i];
      // circles are saved as paths in inkscape, so the path_node is either a circle or
      // a real path
      var shape = Circle.fromSVGPath(path_node, false) ||
                Polygon.fromSVGPath(path_node, 1, false);
      if (shape instanceof Polygon) {
        shape.merge_vertices({min_dist: 1, min_vertex_count: 2});
      }
      shape.svg_transform = path_node.getCTM();
      shape.style = readStyle(path_node);
      scale_stroke_width(shape, extract_scaling(shape.svg_transform));
      shapes.push(shape);
    }

    apply_transformations([frame], 0, 0, 1, root);
    var s  = 100/Math.abs(frame.pts[0].x-frame.pts[1].x)
       ,dx = -Math.min(frame.pts[0].x, frame.pts[1].x)
       ,dy = -Math.min(frame.pts[0].y, frame.pts[2].y)
    apply_transformations(shapes, dx, dy, s, root);

    return new SVGScene(shapes, frame);
  }
  pub.parseFile = parseFile;

  /// Applies the svg transformation to each object.
  var apply_transformations = function(shapes, dx, dy, s, svg) {
    var svg_pt = svg.createSVGPoint(0,0);
    shapes.forEach(function(shape) {
      var transform = function(p) {
        svg_pt.x = p.x; svg_pt.y = p.y;
        svg_pt = svg_pt.matrixTransform(shape.svg_transform);
        p.x = s*svg_pt.x+dx; p.y = s*svg_pt.y+dy;
      }
      if (shape instanceof Circle) {
        var c = shape.centroid(); transform(c);
        shape.x = c.x; shape.y = c.y;
        shape.r *= Math.abs(shape.svg_transform.a);
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
  }

  return pub;
})();


SVGScene = function(shapes, frame) {
  this.shapes = shapes || []; // may contain polygons or circles
  for (var i=0; i<this.shapes.length; i++) this.shapes[i].id = i;
  this.frame = frame; // a polygon
  this.width = 100;
  this.height = 100;
  this.friction = 0.3;
  this.restitution = 0.1;
  this.pixels_per_unit = 50;
}

SVGScene.prototype.renderInSvg = function(doc, parent, x, y, scale) {
  var g = doc.createElementNS('http://www.w3.org/2000/svg','g');
  g.setAttribute('transform', 'translate('+(x)+','+(y)+') scale('+scale+')');
  parent.appendChild(g);
  var rect = doc.createElementNS('http://www.w3.org/2000/svg','rect');
  rect.setAttribute('x',0);
  rect.setAttribute('y',0);
  rect.setAttribute('width', this.height);
  rect.setAttribute('height', this.width);
  rect.setAttribute('style','fill:none; stroke:black; stroke-width:1px');
  g.appendChild(rect);
  this.shapes.forEach(function (shape) {
    var svg_obj = shape.renderInSvg(document, g);
    for (var s in shape.style) svg_obj.style.setProperty(s, shape.style[s]);
  });
}
