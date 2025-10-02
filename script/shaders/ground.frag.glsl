uniform float iTime;
uniform vec2 iResolution;

uniform vec3 color1;
uniform vec3 color2;
uniform vec3 color3;
uniform vec3 color4;


varying vec2 vUv;

#define PI 3.14159265359



void main() {
  //vec2 uv = (fragCoord - iResolution.xy/2.)/iResolution.y;

  vec2 uv = vUv;

  uv = uv - 0.5;  // now uv ranges from -0.5 .. 0.5

  vec2 uv0 = uv;

  float scale = 30.;
  //GRID SCALE

  uv = round(uv*scale)/scale;

  float m = .15;

  float angle = atan(uv.x,uv.y) + iTime;

  float r = m/PI*angle;

  uv.x = length(uv.xy) - r;

  uv.x = mod(uv.x - m,2.*m) - m;

  float stripe = abs(uv.x)/m - m; 
  stripe-=.25 * 2.2;

  //THICCNESS

  uv = uv0;

  uv = mod(uv - .5/scale, 1./scale) - .5/scale;

  float circle = step(length(uv), max(sqrt(m*stripe/scale/2.), .003));

  uv = uv0;

  float row = round(uv.x*scale);
  float ln = round(uv.y*scale);

  float sum = mod(mod(row, 3.) + mod(ln,2.) + mod(row - ln, 5.) * mod(row*ln, 3.),4.);

  vec3 col;

  if (sum == 0.) col = color4;
  
  if (sum == 1.0) col = color1;
  if (sum == 2.0) col = color2;
  if (sum == 3.0) col = color3;

  gl_FragColor = vec4(vec3(circle*col), 1);
}