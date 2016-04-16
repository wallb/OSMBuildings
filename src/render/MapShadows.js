
/* This object renders the shadow for the map layer. It only renders the shadow,
 * not the map itself. The intended use for this class is as a blended overlay
 * so that the map can be rendered independently from the shadows cast on it.
 */

render.MapShadows = {

  init: function() {
    this.shader = new glx.Shader({
      vertexShader: Shaders['basemap.shadows'].vertex,
      fragmentShader: Shaders['basemap.shadows'].fragment,
      shaderName: 'map shadows shader',
      attributes: ['aPosition', 'aNormal'],
      uniforms: [
        'uModelMatrix',
        'uViewDirOnMap',
        'uMatrix',
        'uDirToSun',
        'uLowerEdgePoint',
        'uFogDistance',
        'uFogBlurDistance',
        'uShadowTexDimensions', 
        'uShadowStrength',
        'uShadowTexIndex',
        'uSunMatrix',
      ]
    });
    
    this.mapPlane = new mesh.MapPlane();
  },

  render: function(Sun, depthFramebuffer, shadowStrength) {
    var shader = this.shader;
    shader.enable();

    if (this.showBackfaces) {
      gl.disable(gl.CULL_FACE);
    }

    shader.setUniforms([
      ['uDirToSun', '3fv', Sun.direction],
      ['uViewDirOnMap', '2fv',   render.viewDirOnMap],
      ['uLowerEdgePoint', '2fv', render.lowerLeftOnMap],
      ['uFogDistance', '1f', render.fogDistance],
      ['uFogBlurDistance', '1f', render.fogBlurDistance],
      ['uShadowTexDimensions', '2fv', [depthFramebuffer.width, depthFramebuffer.height] ],
      ['uShadowStrength', '1f', shadowStrength]
    ]);

    shader.bindTexture('uShadowTexIndex', 0, depthFramebuffer.depthTexture);

    var item = this.mapPlane;
    if (MAP.zoom < item.minZoom || MAP.zoom > item.maxZoom) {
      return;
    }

    var modelMatrix;
    if (!(modelMatrix = item.getMatrix())) {
      return;
    }

    shader.setUniformMatrices([
      ['uModelMatrix', '4fv', modelMatrix.data],
      ['uMatrix',      '4fv', glx.Matrix.multiply(modelMatrix, render.viewProjMatrix)],
      ['uSunMatrix',   '4fv', glx.Matrix.multiply(modelMatrix, Sun.viewProjMatrix)]
    ]);

    shader.bindBuffer(item.vertexBuffer, 'aPosition');
    shader.bindBuffer(item.normalBuffer, 'aNormal');

    gl.drawArrays(gl.TRIANGLES, 0, item.vertexBuffer.numItems);

    if (this.showBackfaces) {
      gl.enable(gl.CULL_FACE);
    }

    shader.disable();
  },

  destroy: function() {}
};
