
//var ext = GL.getExtension('WEBGL_lose_context');
//ext.loseContext();

var GLX = {};
var GL;

GLX.init = function(container, width, height, highQuality) {
  var canvas = document.createElement('CANVAS');
  canvas.style.position = 'absolute';
  canvas.width = width;
  canvas.height = height;
  container.appendChild(canvas);

  var options = {
    antialias: highQuality,
    depth: true,
    premultipliedAlpha: false
  };

  try {
    GL = canvas.getContext('webgl', options);
  } catch (ex) {}
  if (!GL) {
    try {
      GL = canvas.getContext('experimental-webgl', options);
    } catch (ex) {}
  }
  if (!GL) {
    throw new Error('WebGL not supported');
  }

  canvas.addEventListener('webglcontextlost', function(e) {
    console.warn('context lost');
  });

  canvas.addEventListener('webglcontextrestored', function(e) {
    console.warn('context restored');
  });

  GL.viewport(0, 0, width, height);
  GL.cullFace(GL.BACK);
  GL.enable(GL.CULL_FACE);
  GL.enable(GL.DEPTH_TEST);
  GL.clearColor(0.5, 0.5, 0.5, 1);

  if (highQuality) {
    GL.anisotropyExtension = GL.getExtension('EXT_texture_filter_anisotropic');
    if (GL.anisotropyExtension) {
      GL.anisotropyExtension.maxAnisotropyLevel = GL.getParameter(
        GL.anisotropyExtension.MAX_TEXTURE_MAX_ANISOTROPY_EXT
      );
    }

    GL.depthTextureExtension = GL.getExtension('WEBGL_depth_texture');
  }

  return GL;
};

GLX.start = function(render) {
  return setInterval(function() {
    requestAnimationFrame(render);
  }, 17);
};

GLX.stop = function(loop) {
  clearInterval(loop);
};

GLX.destroy = function() {
  if (GL !== undefined) {
    GL.canvas.parentNode.removeChild(GL.canvas);
    GL = undefined;
  }
};
