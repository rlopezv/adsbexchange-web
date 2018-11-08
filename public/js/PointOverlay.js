/**
 * This file is responsible for handling points overlay.
 * It assumes that Leaflet and D3 are already loaded and are
 * available as global objects
 */
function PointOverlay(map, initialData) {

  // Add a new SVG element to the overlay pane of the map.
  // This SVG will move as map moves
  this._svg = d3.select(map.getPanes().overlayPane).append('svg');

  // Hide this layer when we are zooming (looks better,
  // since points are not jumping around
  this._svg.attr('class', 'leaflet-zoom-hide');

  // Append a single "group" to SVG. It will hold all points
  this._g = this._svg.append('g');

  // Our points
  this._data = [];

  // The bounding rectangle that holds all points
  // we need to track it to resize and position SVG layer
  this._bounds = this._updateBounds();

  // Leaflet's map object
  this._map = map;

  // Once zoom is finished we need to update the on-screen
  // position of all points
  this._map.on('zoomend', this.update.bind(this));

  // Initial positions
  this.update();
}

var _p = PointOverlay.prototype;

/**
 * Add single point to the dataset
 */
_p.addPoint = function(p) {
  this.addPoints([p]);
};

/**
 * Adds multiple new points to the dataset
 */
_p.addPoints = function(points) {

  points.forEach(this._savePoint.bind(this));

  // Create new marker for the added point
  this.updateMarkers();

  // Make sure that SVG is big enough to hold new point
  this.update();

};

/**
 * Adds the required data to the point before saving
 * to the array
 */
_p._savePoint = function(point) {
  // This is Leaflet's internal representation
  // of coordinates. We add it here to avoid re-creating
  // this object each time
  point.LatLng = new L.LatLng( point.lat, point.lng);

  // Time when point arrived. We'll use it for removing points
  // from the layer
  point.time = Date.now();

  this._data.push(point);
};

/**
 * This method is responsible for adding and removing markers.
 * It draws an animation, defines the look (but not the position)
 * of new markers.
 * It also adds mouse listeners.
 */
_p.updateMarkers = function() {

  /**
   * By default D3 will track points by their index in array
   * which will cause visual glitches if part of the array is removed.
   * Tell D3 to track by coordinates instead. Then removing points is
   * smooth.
   */
  var markers = this._g.selectAll('g')
    .data(this._data, function(d) {
      return d.lat + ':' + d.lng
    });

  /**
   * Example of mouseover.
   */
  var mouseOver = function(d, i) {
    d3.select(this)
      .style({
        'fill': 'blue',
        'cursor': 'default'
      });
    console.log(d.lat + ':' + d.lng);
  };

  /**
   * Example of mouseout.
   */
  var mouseOut = function(d, i) {
    d3.select(this).style('fill', 'green');
  };

  /**
   * When the new point appears, we create a separate
   * group for it. We need a "group", not just a circle to
   * hold additional shapes for animations.
   */
  var group = markers.enter()
    .append('g');

  /**
   * What we'll do when new point is added.
   * This is a "main" boundy circle.
   */
  group.append('circle')
    .on('mouseover', mouseOver)
    .on('mouseout', mouseOut)
    .style('stroke', 'black')
    .style('opacity', 0.6)
    .style('fill', 'green')
    .attr('r', 0)
    .transition()
    .duration(350)
    .attr("r", 10)
    .transition()
    .duration(150)
    .attr("r", 7);

  /**
   * This is an animated outer circle with "fade-away" effect.
   * It will be removed as soon as animation ends.
   */
  group.append('circle')
    .style('stroke', 'grey')
    .style('opacity', 0.5)
    .style('fill', 'green')
    .attr('r', 0)
    .transition()
    .duration(350)
    .attr("r", 10)
    .transition()
    .duration(300)
    .attr("r", 20)
    .style('opacity', 0)
    .remove();

  /**
   * When point is removed: fade away (opacity = 0)
   * and then remove element.
   */
  markers
    .exit()
    .transition()
    .style('opacity', 0)
    .remove();
};

/**
 * Updates the size and position of SVG on the map.
 */
_p.update = function() {
  // Calculate the rectangle that will hold all points
  this._updateBounds();

  // Update SVG size and position
  this._setSvgBounds();

  // Update points' position inside of SVG
  this._g.selectAll("circle").attr('transform', this._updateTransform.bind(this))
};

/**
 * For each point: move to the right place given current
 * SVG coordinates. Remember, point coordinates are relative
 * to SVG, not to the map.
 */
_p._updateTransform = function(d) {
  var p = this._map.latLngToLayerPoint(d.LatLng);
  return 'translate('+
    (p.x - this._bounds.x) + ',' +
    (p.y - this._bounds.y) + ')';
};

/**
 * Update the size and position of SVG element
 */
_p._setSvgBounds = function() {
  this._svg
    .attr('width', this._bounds.width + 'px')
    .attr('height', this._bounds.height + 'px')
    .style({
      'left': this._bounds.x + 'px',
      'top': this._bounds.y + 'px'
    });
};

/**
 * Recalculate bounds and add margins (to incorporate shape sizes)
 */
_p._updateBounds = function() {
  var rawBounds = this._getRawBounds();
  var margin = 20;

  this._bounds = {
    x: rawBounds.minX - margin,
    y: rawBounds.minY - margin,
    width: rawBounds.maxX - rawBounds.minX + margin*2,
    height: rawBounds.maxY - rawBounds.minY + margin*2
  };
};

/**
 * Find the smallest rectangle that is big enough to hold
 * all the points (in map overlay coordinate space)
 */
_p._getRawBounds = function() {
  var data = this._data;

  if (data.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0
    }
  }

  var p1 = this._map.latLngToLayerPoint(data[0].LatLng);
  var initial = {
    minX: p1.x,
    minY: p1.y,
    maxX: p1.x,
    maxY: p1.y
  };

  var bounds = data.reduce(function(bounds, point) {
    var p = this._map.latLngToLayerPoint(point.LatLng);
    return this._extendBounds(p, bounds);
  }.bind(this), initial);

  return bounds;
};

/**
 * Given an existing bounds and a point, create new
 * bounds that include new point. Bounds change or might
 * not change if the point is inside the existing rectangle
 */
_p._extendBounds = function(p, bounds) {
  if (p.x < bounds.minX) {
    bounds.minX = p.x;
  }

  if (p.x > bounds.maxX) {
    bounds.maxX = p.x;
  }

  if (p.y < bounds.minY) {
    bounds.minY = p.y;
  }

  if (p.y > bounds.maxY) {
    bounds.maxY = p.y;
  }

  return bounds;
};

/**
 * This method finds all points that are older than
 * threshold and removes them. Must be called externally.
 */
_p.removeOldPoints = function() {

  var threshold = 60000;
  var oldIndex = -1;
  var now = Date.now();

  while (oldIndex < this._data.length - 1 &&
      now - this._data[oldIndex + 1].time > threshold) {
    oldIndex++;
  }

  if (oldIndex > -1) {
    this._data.splice(0, oldIndex + 1);
    this.updateMarkers();
  }
};


_p.leaveOnlyNPoints = function(n) {
  this._data.splice(0, this._data.length - n);
  this.updateMarkers();
};