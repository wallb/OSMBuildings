precision highp float;  //is default in vertex shaders anyway, using highp fixes #49

#define halfPi 1.57079632679

attribute vec4 aPosition;
attribute vec2 aTexCoord;
attribute vec3 aNormal;
attribute vec3 aColor;
attribute vec4 aFilter;
attribute vec3 aID;

uniform mat4 uModelMatrix;
uniform mat4 uMatrix;

uniform mat3 uNormalTransform;
uniform vec3 uLightDirection;
uniform vec3 uLightColor;

uniform vec3 uHighlightColor;
uniform vec3 uHighlightID;
uniform vec2 uViewDirOnMap;
uniform vec2 uLowerEdgePoint;

uniform float uTime;

varying vec3 vColor;
varying vec2 vTexCoord;
varying float verticalDistanceToLowerEdge;

const float gradientHeight = 90.0;
const float gradientStrength = 0.4;

void main() {

  float t = clamp((uTime-aFilter.r) / (aFilter.g-aFilter.r), 0.0, 1.0);
  float f = aFilter.b + (aFilter.a-aFilter.b) * t;

  if (f == 0.0) {
    gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
    vColor = vec3(0.0, 0.0, 0.0);
  } else {

    vec4 pos = vec4(aPosition.x, aPosition.y, aPosition.z*f, aPosition.w);
    gl_Position = uMatrix * pos;

    //*** highlight object ******************************************************

    vec3 color = aColor;
    if (uHighlightID == aID) {
      color = mix(aColor, uHighlightColor, 0.5);
    }

    //*** light intensity, defined by light direction on surface ****************

    vec3 transformedNormal = aNormal * uNormalTransform;
    float lightIntensity = max( dot(transformedNormal, uLightDirection), 0.0) / 1.5;
    color = color + uLightColor * lightIntensity;
    vTexCoord = aTexCoord;
    //*** vertical shading ******************************************************

    float verticalShading = clamp((gradientHeight-pos.z) / (gradientHeight/gradientStrength), 0.0, gradientStrength);

    //***************************************************************************

    vColor = color-verticalShading;
    vec4 worldPos = uModelMatrix * pos;
    vec2 dirFromLowerEdge = worldPos.xy / worldPos.w - uLowerEdgePoint;
    verticalDistanceToLowerEdge = dot(dirFromLowerEdge, uViewDirOnMap);
  }
}
