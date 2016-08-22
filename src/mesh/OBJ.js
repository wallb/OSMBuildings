mesh.OBJ = (function() {

  function parseMTL(str) {
    var
      lines = str.split(/[\r\n]/g),
      cols,
      materials = {},
      data = null;

    for (var i = 0, il = lines.length; i < il; i++) {
      cols = lines[i].trim().split(/\s+/);

      switch (cols[0]) {
        case 'newmtl':
          storeMaterial(materials, data);
          data = { id:cols[1], color:{} };
          break;

        case 'Kd':
          data.color = [
            parseFloat(cols[1]),
            parseFloat(cols[2]),
            parseFloat(cols[3])
          ];
          break;

        case 'd':
          data.color[3] = parseFloat(cols[1]);
          break;
      }
    }

    storeMaterial(materials, data);
    str = null;

    return materials;
  }

  function storeMaterial(materials, data) {
    if (data !== null) {
      materials[ data.id ] = data.color;
    }
  }

  function parseOBJ(str, materials) {
    var
      vertexIndex = [],
      texCoordIndex = [],
      lines = str.split(/[\r\n]/g), cols,
      meshes = [],
      id,
      color,
      faces = [];

    for (var i = 0, il = lines.length; i < il; i++) {
      cols = lines[i].trim().split(/\s+/);

      switch (cols[0]) {
        case 'g':
        case 'o':
          storeOBJ(vertexIndex, texCoordIndex, meshes, id, color, faces);
          id = cols[1];
          faces = [];
          break;

        case 'usemtl':
          storeOBJ(vertexIndex, texCoordIndex, meshes, id, color, faces);
          if (materials[ cols[1] ]) {
            color = materials[ cols[1] ];
          }
          faces = [];
          break;

        case 'v':
          vertexIndex.push([parseFloat(cols[1]), parseFloat(cols[2]), parseFloat(cols[3])]);
          break;

        case 'vt':
          texCoordIndex.push([parseFloat(cols[1]), parseFloat(cols[2])]);
          break;

        case 'f':
	  tripletA = cols[1].split(/\/+/);
	  tripletB = cols[2].split(/\/+/);
	  tripletC = cols[3].split(/\/+/);
          faces.push([
	      // vertex indices for the face
	      parseFloat(tripletA[0])-1, parseFloat(tripletB[0])-1, parseFloat(tripletC[0])-1,
	      // texture coordinate indices for the face
	      parseFloat(tripletA[1])-1, parseFloat(tripletB[1])-1, parseFloat(tripletC[1])-1
	  ]);
          break;
      }
    }

    storeOBJ(vertexIndex, texCoordIndex, meshes, id, color, faces);
    str = null;

    return meshes;
  }

  function storeOBJ(vertexIndex, texCoordIndex, meshes, id, color, faces) {
    if (faces.length) {
      var geometry = createGeometry(vertexIndex, texCoordIndex, faces);
      meshes.push({
        id: id,
        color: color,
        vertices: geometry.vertices,
        normals: geometry.normals,
        texCoords: geometry.texCoords
      });
    }
  }

  function createGeometry(vertexIndex, texCoordIndex, faces) {
    var
      v0, v1, v2,
      nor,
      geometry = { vertices:[], normals:[], texCoords:[] };

    for (var i = 0, il = faces.length; i < il; i++) {
      v0 = vertexIndex[ faces[i][0] ];
      v1 = vertexIndex[ faces[i][1] ];
      v2 = vertexIndex[ faces[i][2] ];

      nor = normal(v0, v1, v2);

      if (texCoordIndex.length) {
        tc0 = texCoordIndex[ faces[i][3] ];
        tc1 = texCoordIndex[ faces[i][4] ];
        tc2 = texCoordIndex[ faces[i][5] ];
      } else {
        tc0 = [0.0, 0.0];
        tc1 = [0.0, 0.0];
        tc2 = [0.0, 0.0];
      }
	
      geometry.vertices.push(
        v0[0], v0[2], v0[1],
        v1[0], v1[2], v1[1],
        v2[0], v2[2], v2[1]
      );

      geometry.normals.push(
        nor[0], nor[1], nor[2],
        nor[0], nor[1], nor[2],
        nor[0], nor[1], nor[2]
      );

      geometry.texCoords.push(
        tc0[0], tc0[1],
        tc1[0], tc1[1],
        tc2[0], tc2[1]
      );
    }

    return geometry;
  }

  //***************************************************************************

  function constructor(url, position, options) {
    options = options || {};

    this.id = options.id;
    if (options.color) {
      this.color = new Color(options.color).toArray();
    }

    this.replace   = !!options.replace;
    this.scale     = options.scale     || 1;
    this.rotation  = options.rotation  || 0;
    this.elevation = options.elevation || 0;
    this.position  = position;

    this.minZoom = parseFloat(options.minZoom) || APP.minZoom;
    this.maxZoom = parseFloat(options.maxZoom) || APP.maxZoom;
    if (this.maxZoom < this.minZoom) {
      this.maxZoom = this.minZoom;
    }

    this.data = {
      colors: [],
      ids: [],
      vertices: [],
      normals: [],
      texCoords: []
    };

    Activity.setBusy();
    this.request = Request.getText(url, function(obj) {
      this.request = null;
      var match;
      if ((match = obj.match(/^mtllib\s+(.*)$/m))) {
        this.request = Request.getText(url.replace(/[^\/]+$/, '') + match[1], function(mtl) {
          this.request = null;
          this.onLoad(obj, parseMTL(mtl));
        }.bind(this));
      } else {
        this.onLoad(obj, null);
      }
    }.bind(this));
  }

  constructor.prototype = {
    onLoad: function(obj, mtl) {
      this.items = [];
      this.addItems( parseOBJ(obj, mtl) );
      this.onReady();
    },

    addItems: function(items) {
      var
        feature, color, idColor, j, jl,
        id, colorVariance,
        defaultColor = new Color(DEFAULT_COLOR).toArray();

      for (var i = 0, il = items.length; i < il; i++) {
        feature = items[i];

        [].push.apply(this.data.vertices,  feature.vertices);
        [].push.apply(this.data.normals,   feature.normals);
        [].push.apply(this.data.texCoords, feature.texCoords);

        id = this.id || feature.id;
        idColor = render.Picking.idToColor(id);

        colorVariance = (id/2 % 2 ? -1 : +1) * (id % 2 ? 0.03 : 0.06);
        color = this.color || feature.color || defaultColor;
        for (j = 0, jl = feature.vertices.length - 2; j<jl; j += 3) {
          [].push.apply(this.data.colors, add3scalar(color, colorVariance));
          [].push.apply(this.data.ids, idColor);
        }

        this.items.push({ id:id, vertexCount:feature.vertices.length/3, data:feature.data });

        APP.emit('loadfeature', feature);
      }
    },

    fadeIn: function() {
      var item, filters = [];
      var start = Filter.getTime() + 250, end = start + 500;
      render.FrameControl.requestFramesUntilTime(Date.now() + 750);
      for (var i = 0, il = this.items.length; i < il; i++) {
        item = this.items[i];
        item.filter = [start, end, 0, 1];
        for (var j = 0, jl = item.vertexCount; j < jl; j++) {
          filters.push.apply(filters, item.filter);
        }
      }
      this.filterBuffer = new GLX.Buffer(4, new Float32Array(filters));
    },

    applyFilter: function() {
      var item, filters = [];
      for (var i = 0, il = this.items.length; i < il; i++) {
        item = this.items[i];
        for (var j = 0, jl = item.vertexCount; j < jl; j++) {
          filters.push.apply(filters, item.filter);
        }
      }
      this.filterBuffer = new GLX.Buffer(4, new Float32Array(filters));
    },

    onReady: function() {
      this.vertexBuffer   = new GLX.Buffer(3, new Float32Array(this.data.vertices));
      this.normalBuffer   = new GLX.Buffer(3, new Float32Array(this.data.normals));
      this.texCoordBuffer = new GLX.Buffer(2, new Float32Array(this.data.texCoords));
      this.colorBuffer    = new GLX.Buffer(3, new Float32Array(this.data.colors));
      this.idBuffer       = new GLX.Buffer(3, new Float32Array(this.data.ids));
      this.fadeIn();
      this.data = null;

      Filter.apply(this);
      data.Index.add(this);

      this.isReady = true;
      Activity.setIdle();
    },

    // TODO: switch to a notation like mesh.transform
    getMatrix: function() {
      var matrix = new GLX.Matrix();

      if (this.elevation) {
        matrix.translate(0, 0, this.elevation);
      }

      matrix.scale(this.scale, this.scale, this.scale);

      if (this.rotation) {
        matrix.rotateZ(-this.rotation);
      }

      var metersPerDegreeLongitude = METERS_PER_DEGREE_LATITUDE * 
                                     Math.cos(MAP.position.latitude / 180 * Math.PI);

      var dLat = this.position.latitude - MAP.position.latitude;
      var dLon = this.position.longitude- MAP.position.longitude;
      
      matrix.translate( dLon * metersPerDegreeLongitude,
                       -dLat * METERS_PER_DEGREE_LATITUDE, 0);
      
      return matrix;
    },

    destroy: function() {
      data.Index.remove(this);

      if (this.request) {
        this.request.abort();
      }

      this.items = [];

      if (this.isReady) {
        this.vertexBuffer.destroy();
        this.texCoordBuffer.destroy();
        this.normalBuffer.destroy();
        this.colorBuffer.destroy();
        this.idBuffer.destroy();
      }

      render.FrameControl.requestFrame();
    }
  };

  return constructor;

}());
