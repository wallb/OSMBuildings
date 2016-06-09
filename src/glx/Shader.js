
GLX.Shader = function(config) {
  var i;

  this.shaderName = config.shaderName;
  this.id = GL.createProgram();

  this.attach(GL.VERTEX_SHADER,   config.vertexShader);
  this.attach(GL.FRAGMENT_SHADER, config.fragmentShader);

  GL.linkProgram(this.id);

  if (!GL.getProgramParameter(this.id, GL.LINK_STATUS)) {
    throw new Error(GL.getProgramParameter(this.id, GL.VALIDATE_STATUS) +'\n'+ GL.getError());
  }

  this.attributeNames = config.attributes || [];
  this.uniformNames   = config.uniforms || [];
  GL.useProgram(this.id);

  this.attributes = {};
  for (i = 0; i < this.attributeNames.length; i++) {
    this.locateAttribute(this.attributeNames[i]);
  }
  
  this.uniforms = {};
  for (i = 0; i < this.uniformNames.length; i++) {
    this.locateUniform(this.uniformNames[i]);
  }
};

GLX.Shader.warned = {};
GLX.Shader.prototype = {

  locateAttribute: function(name) {
    var loc = GL.getAttribLocation(this.id, name);
    if (loc < 0) {
      console.warn('unable to locate attribute "%s" in shader "%s"', name, this.shaderName);
      return;
    }
    this.attributes[name] = loc;
  },

  locateUniform: function(name) {
    var loc = GL.getUniformLocation(this.id, name);
    if (!loc) {
      console.warn('unable to locate uniform "%s" in shader "%s"', name, this.shaderName);
      return;
    }
    this.uniforms[name] = loc;
  },

  attach: function(type, src) {
    var shader = GL.createShader(type);
    GL.shaderSource(shader, src);
    GL.compileShader(shader);

    if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
      throw new Error(GL.getShaderInfoLog(shader));
    }

    GL.attachShader(this.id, shader);
  },

  enable: function() {
    GL.useProgram(this.id);

    for (var name in this.attributes) {
      GL.enableVertexAttribArray(this.attributes[name]);
    }
    
    return this;
  },

  disable: function() {
    if (this.attributes) {
      for (var name in this.attributes) {
        GL.disableVertexAttribArray(this.attributes[name]);
      }
    }
  },
  
  bindBuffer: function(buffer, attribute) {
    if (this.attributes[attribute] === undefined) {
      var qualifiedName = this.shaderName + ":" + attribute;
      if ( !GLX.Shader.warned[qualifiedName]) {
        console.warn('attempt to bind VBO to invalid attribute "%s" in shader "%s"', attribute, this.shaderName);
        GLX.Shader.warned[qualifiedName] = true;
      }
      return;
    }
    
    buffer.enable();
    GL.vertexAttribPointer(this.attributes[attribute], buffer.itemSize, GL.FLOAT, false, 0, 0);
  },
  
  setUniform: function(uniform, type, value) {
    if (this.uniforms[uniform] === undefined) {
      var qualifiedName = this.shaderName + ":" + uniform;
      if ( !GLX.Shader.warned[qualifiedName]) {
        console.warn('attempt to bind to invalid uniform "%s" in shader "%s"', uniform, this.shaderName);
        GLX.Shader.warned[qualifiedName] = true;
      }

      return;
    }
    GL['uniform'+ type]( this.uniforms[uniform], value);
  },

  setUniforms: function(uniforms) {
    for (var i in uniforms) {
      this.setUniform(uniforms[i][0], uniforms[i][1], uniforms[i][2]);
    }
  },

  setUniformMatrix: function(uniform, type, value) {
    if (this.uniforms[uniform] === undefined) {
      var qualifiedName = this.shaderName + ":" + uniform;
      if ( !GLX.Shader.warned[qualifiedName]) {
        console.warn('attempt to bind to invalid uniform "%s" in shader "%s"', uniform, this.shaderName);
        GLX.Shader.warned[qualifiedName] = true;
      }
      return;
    }
    GL['uniformMatrix'+ type]( this.uniforms[uniform], false, value);
  },

  setUniformMatrices: function(uniforms) {
    for (var i in uniforms) {
      this.setUniformMatrix(uniforms[i][0], uniforms[i][1], uniforms[i][2]);
    }
  },
  
  bindTexture: function(uniform, textureUnit, glxTexture) {
    glxTexture.enable(textureUnit);
    this.setUniform(uniform, "1i", textureUnit);
  },

  destroy: function() {
    this.disable();
    this.id = null;
  }
};
