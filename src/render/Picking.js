
// TODO: perhaps render only clicked area

render.Picking = {

  idMapping: [null],
  viewportSize: 512,

  init: function() {
    this.shader = new glx.Shader({
      vertexShader: Shaders.picking.vertex,
      fragmentShader: Shaders.picking.fragment,
      shaderName: 'picking shader',
      attributes: ['aPosition', 'aID', 'aFilter'],
      uniforms: [
        'uModelMatrix',
        'uMatrix',
        'uFogRadius',
        'uTime'
      ]
    });

    this.framebuffer = new glx.Framebuffer(this.viewportSize, this.viewportSize);
  },

  render: function(framebufferSize) {
    var
      shader = this.shader,
      framebuffer = this.framebuffer;

    framebuffer.setSize(framebufferSize[0], framebufferSize[1]);
    
    shader.enable();
    framebuffer.enable();
    gl.viewport(0, 0, framebufferSize[0], framebufferSize[1]);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    shader.setUniforms([
      ['uFogRadius', '1f', render.fogDistance],
      ['uTime',      '1f', Filter.getTime()]
    ]);

    var
      dataItems = data.Index.items,
      item,
      modelMatrix;

    for (var i = 0, il = dataItems.length; i<il; i++) {
      item = dataItems[i];

      if (MAP.zoom<item.minZoom || MAP.zoom>item.maxZoom) {
        continue;
      }

      if (!(modelMatrix = item.getMatrix())) {
        continue;
      }

      shader.setUniformMatrices([
        ['uModelMatrix', '4fv', modelMatrix.data],
        ['uMatrix',      '4fv', glx.Matrix.multiply(modelMatrix, render.viewProjMatrix)]
      ]);

      shader.bindBuffer(item.vertexBuffer, 'aPosition');
      shader.bindBuffer(item.idBuffer, 'aID');
      shader.bindBuffer(item.filterBuffer, 'aFilter');

      gl.drawArrays(gl.TRIANGLES, 0, item.vertexBuffer.numItems);
    }

    this.shader.disable();
    this.framebuffer.disable();
    gl.viewport(0, 0, MAP.width, MAP.height);
  },
  
  // TODO: throttle calls
  getTarget: function(x, y, callback) {
    requestAnimationFrame(function() {
      this.render( [this.viewportSize, this.viewportSize] );

      x = x/MAP.width *this.viewportSize <<0;
      y = y/MAP.height*this.viewportSize <<0;

      this.framebuffer.enable();
      var imageData = this.framebuffer.getPixel(x, this.viewportSize - 1 - y);
      this.framebuffer.disable();

      if (imageData === undefined) {
        callback(undefined);
        return;
      }
      var color = imageData[0] | (imageData[1]<<8) | (imageData[2]<<16);

      callback(this.idMapping[color]);
    }.bind(this));
  },

  idToColor: function(id) {
    var index = this.idMapping.indexOf(id);
    if (index === -1) {
      this.idMapping.push(id);
      index = this.idMapping.length-1;
    }
    return [
      ( index        & 0xff) / 255,
      ((index >>  8) & 0xff) / 255,
      ((index >> 16) & 0xff) / 255
    ];
  },

  destroy: function() {}
};
