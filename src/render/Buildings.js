
render.Buildings = {

  init: function() {
  
    this.shaderNoShadows = new GLX.Shader({
        vertexShader: Shaders.buildings.vertex,
        fragmentShader: Shaders.buildings.fragment,
        shaderName: 'building shader',
        attributes: ['aPosition', 'aTexCoord', 'aColor', 'aFilter', 'aNormal', 'aID'],
        uniforms: [
          'uModelMatrix',
          'uViewDirOnMap',
          'uMatrix',
          'uNormalTransform',
          'uLightColor',
          'uLightDirection',
          'uLowerEdgePoint',
          'uFogDistance',
          'uFogBlurDistance',
          'uHighlightColor',
          'uHighlightID',
          'uTime',
          'uWallTexIndex'
        ]
    });
    this.shaderShadows = new GLX.Shader({
        vertexShader: Shaders['buildings.shadows'].vertex,
        fragmentShader: Shaders['buildings.shadows'].fragment,
        shaderName: 'quality building shader',
        attributes: ['aPosition', 'aTexCoord', 'aColor', 'aFilter', 'aNormal', 'aID'],
        uniforms: [
          'uFogDistance',
          'uFogBlurDistance',
          'uHighlightColor',
          'uHighlightID',
          'uLightColor',
          'uLightDirection',
          'uLowerEdgePoint',
          'uMatrix',
          'uModelMatrix',
          'uSunMatrix',
          'uShadowTexIndex',
          'uShadowTexDimensions',
          'uTime',
          'uViewDirOnMap',
          'uWallTexIndex'
        ]
    });
    
    this.wallTexture = new GLX.texture.Image();
    this.wallTexture.color( [1,1,1]);
    this.wallTexture.load( BUILDING_TEXTURE);
  },

  render: function(depthFramebuffer, shadowStrength) {

    var shader = depthFramebuffer ? this.shaderShadows : this.shaderNoShadows;
    shader.enable();

    if (this.showBackfaces) {
      GL.disable(GL.CULL_FACE);
    }

    if (!this.highlightID) {
      this.highlightID = [0, 0, 0];
    }

    shader.setUniforms([
      ['uFogDistance',     '1f',  render.fogDistance],
      ['uFogBlurDistance', '1f',  render.fogBlurDistance],
      ['uHighlightColor',  '3fv', render.highlightColor],
      ['uHighlightID',     '3fv', this.highlightID],
      ['uLightColor',      '3fv', [0.5, 0.5, 0.5]],
      ['uLightDirection',  '3fv', Sun.direction],
      ['uLowerEdgePoint',  '2fv', render.lowerLeftOnMap],
      ['uTime',            '1f',  Filter.getTime()],
      ['uViewDirOnMap',    '2fv', render.viewDirOnMap]
    ]);

    if (!render.effects.shadows) {
      shader.setUniformMatrix('uNormalTransform', '3fv', GLX.Matrix.identity3().data);
    }

    shader.bindTexture('uWallTexIndex', 0, this.wallTexture);
    
    if (depthFramebuffer) {
      shader.setUniform('uShadowTexDimensions', '2fv', [depthFramebuffer.width, depthFramebuffer.height]);
      shader.bindTexture('uShadowTexIndex', 1, depthFramebuffer.depthTexture);
    }

    var
      dataItems = data.Index.items,
      item,
      modelMatrix;

    for (var i = 0, il = dataItems.length; i < il; i++) {
      // no visibility check needed, Grid.purge() is taking care

      item = dataItems[i];

      if (MAP.zoom < item.minZoom || MAP.zoom > item.maxZoom || !(modelMatrix = item.getMatrix())) {
        continue;
      }

      shader.setUniformMatrices([
        ['uModelMatrix', '4fv', modelMatrix.data],
        ['uMatrix',      '4fv', GLX.Matrix.multiply(modelMatrix, render.viewProjMatrix)]
      ]);
      
      if (render.effects.shadows) {
        shader.setUniformMatrix('uSunMatrix', '4fv', GLX.Matrix.multiply(modelMatrix, Sun.viewProjMatrix));
      }

      shader.bindBuffer(item.vertexBuffer,   'aPosition');
      shader.bindBuffer(item.texCoordBuffer, 'aTexCoord');
      shader.bindBuffer(item.normalBuffer,   'aNormal');
      shader.bindBuffer(item.colorBuffer,    'aColor');
      shader.bindBuffer(item.filterBuffer,   'aFilter');
      shader.bindBuffer(item.idBuffer,       'aID');

      GL.drawArrays(GL.TRIANGLES, 0, item.vertexBuffer.numItems);
    }

    if (this.showBackfaces) {
      GL.enable(GL.CULL_FACE);
    }

    shader.disable();
  },

  destroy: function() {}
};
