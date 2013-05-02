function RepFinder(map, key, options){
	options = options || {};
	
	this.classNames_ = options.classNames || {};
	this.map_ = map;
	this.key_ = key;
	this.polygons_ = [];
}


RepFinder.prototype.setMap = function(latlng, level, reset) {
	// Makes a SQL query depending on desired level of representation
	if (!latlng) return;
	
	var lat = latlng.lat();
	var lng = latlng.lng();

	var url = ['https://www.googleapis.com/fusiontables/v1/query?'];
	
	if (level == 'senate') {
		url.push('sql=SELECT id, geometry FROM 17aT9Ud-YnGiXdXEJUyycH2ocUqreOeKGbzCkUw WHERE ST_INTERSECTS(geometry, CIRCLE(LATLNG(' + lat + ', ' + lng + '), 1))');
	} else if (level == 'congress') {
		url.push('sql=SELECT * FROM 1QlQxBF17RR-89NCYeBmw4kFzOT3mLENp60xXAJM WHERE ST_INTERSECTS(geometry, CIRCLE(LATLNG(' + lat + ', ' + lng + '), 1))');//C_STATE = \''+ district +'\'');
	} else if (level == 'state') {
		
	} else if (level == 'local') {
		
	}

	url.push('&key=' + this.key_);

	var $this = this;
	$.ajax({
		url: url.join(''),
		dataType: 'json',
		success: function (data) {
			$this.clearPolygons();

			var rows = data['rows'];
			if (rows !== undefined) {
				$this.drawBoundary(rows, level, reset);
				$this.getReps(data, level);
			}
		}

	});
};


RepFinder.prototype.getReps = function(data, level) {

	$('#reps').html('');

	if (level == 'senate') {
		this.currDistrict_ = data['rows'][0][0];

		$('#reps').append('<img class="rep" src="public/reps/sheldonwhitehouse.png" />');
		$('#reps').append('<img class="rep" src="public/reps/johnreed.png" />');
	} else if (level == 'congress') {
		this.currDistrict_ = data['rows'][0][1] + '-' + data['rows'][0][0];

		$('#reps').append('<img class="rep" src="public/reps/davidcicilline.png" />');
	}

};

// Given the result of a SQL query and the level of representation, draws the district boundaries
RepFinder.prototype.drawBoundary = function(rows, level, reset) {
	
	// Given an array of coordinates, returns an array of coordinates as LatLngs
	function extractCoords(arr) {
		var coords = [];
		for (var i in arr) {
			coords.push(new google.maps.LatLng(arr[i][1], arr[i][0]));
		}

		return coords;
	}

	var geometry;
	var geometries;

	if (level === 'senate') {
		if (rows[0][1]['geometry'] != undefined) {
			geometry = rows[0][1]['geometry'];
		} else {
			geometries = rows[0][1]['geometries'];
		}

	} else if (level === 'congress') {
		if (rows[0][5]['geometry'] != undefined) {
			geometry = rows[0][5]['geometry'];
		} else {
			geometries = rows[0][5]['geometries']
		}
	}

	if (geometry) {
		var coordArr = geometry['coordinates'][0];
		var coords = extractCoords(coordArr);
		this.drawPolygon(coords);
	} else {
		for (var i in geometries) {
			var coordArr = geometries[i]['coordinates'][0];
			var coords = extractCoords(coordArr);

			this.drawPolygon(coords);
		}
	}

	if (reset) {
		this.centerAndZoom();
	}
};


// Given an array of LatLng coordinates, creates and draws polygons on map
RepFinder.prototype.drawPolygon = function(coords) {
	var polygon = new google.maps.Polygon({
		paths: coords,
		strokeColor: '#005468',
		strokeOpacity: 0.7,
		strokeWeight: 3,
		fillColor: '#005468',
		fillOpacity: 0.15,
		clickable: false
	});

	this.polygons_.push(polygon); // keep track of new polygons
	polygon.setMap(this.map_);
};

// Removes and deletes the polygon overlays
RepFinder.prototype.clearPolygons = function() {
	if (this.polygons_.length > 0) {
		for (var i in this.polygons_) {
			this.polygons_[i].setMap(null);
		}

		this.polygons_.length = 0;
	}
};

// Uses the polygon boundaries to find the appropriate center and zoom level
RepFinder.prototype.centerAndZoom = function() {

	var $this = this;
	// Given the bounds, finds the highest zoom level that fits the entire polygon
	function getZoomByBounds(bounds){
	  var MAX_ZOOM = $this.map_.mapTypes.get( $this.map_.getMapTypeId() ).maxZoom || 21 ;
	  var MIN_ZOOM = $this.map_.mapTypes.get( $this.map_.getMapTypeId() ).minZoom || 0 ;

	  var ne = $this.map_.getProjection().fromLatLngToPoint( bounds.getNorthEast() );
	  var sw = $this.map_.getProjection().fromLatLngToPoint( bounds.getSouthWest() ); 

	  var worldCoordWidth = Math.abs(ne.x-sw.x);
	  var worldCoordHeight = Math.abs(ne.y-sw.y);

	  //Fit padding in pixels 
	  var FIT_PAD = 40;

	  for( var zoom = MAX_ZOOM; zoom >= MIN_ZOOM; --zoom ){ 
	      if( worldCoordWidth*(1<<zoom)+2*FIT_PAD < $($this.map_.getDiv()).width() && 
	          worldCoordHeight*(1<<zoom)+2*FIT_PAD < $($this.map_.getDiv()).height() )
	          return zoom;
	  }
	  return 0;
	}

	var latlngbounds = new google.maps.LatLngBounds();
	
	for (var i in this.polygons_) {
		this.polygons_[i].getPath().forEach(function(ele, idx) {
			latlngbounds.extend(ele);
		});
	}

	this.map_.setCenter(latlngbounds.getCenter());
	this.map_.setZoom(getZoomByBounds(latlngbounds));
};
