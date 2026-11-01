// Progressive extras for the home page. Without this file the page still works: the hero and the
// nest stay as still pictures.
(function () {
  'use strict';

  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function whileVisible(element, rootMargin, callback) {
    if (!('IntersectionObserver' in window)) { callback(true); return; }
    new IntersectionObserver(function (entries) {
      callback(entries[entries.length - 1].isIntersecting);
    }, { rootMargin: rootMargin }).observe(element);
  }

  // Hero: swaps the still for the wingbeat loop, whose first frame is that same still.
  function startHeroLoop() {
    var stage = document.querySelector('[data-hero]');
    var saveData = navigator.connection && navigator.connection.saveData;
    if (!stage || calm || saveData || !window.matchMedia('(min-width: 768px)').matches) return;

    var video = document.createElement('video');
    video.className = 'hero-video';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('aria-hidden', 'true');
    video.src = 'assets/video/hero-loop.mp4';
    video.addEventListener('playing', function () { video.classList.add('is-playing'); }, { once: true });
    stage.appendChild(video);

    whileVisible(stage, '0px', function (visible) {
      if (visible) {
        var playing = video.play();
        if (playing) playing.catch(function () {});
      } else {
        video.pause();
      }
    });
  }

  // Nest: a drag-to-look panorama drawn straight from the store's 360 preview.
  var VERTEX = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }';
  var FRAGMENT = [
    'precision highp float;',
    'uniform sampler2D sky;',
    'uniform vec2 size;',
    'uniform float yaw;',
    'uniform float pitch;',
    'uniform float zoom;',
    'const float PI = 3.14159265;',
    'void main() {',
    '  vec2 s = (gl_FragCoord.xy / size * 2.0 - 1.0) * vec2(size.x / size.y, 1.0) * zoom;',
    '  vec3 d = normalize(vec3(s, 1.0));',
    '  float cp = cos(pitch), sp = sin(pitch), cy = cos(yaw), sy = sin(yaw);',
    '  d = vec3(d.x, cp * d.y + sp * d.z, cp * d.z - sp * d.y);',
    '  d = vec3(cy * d.x + sy * d.z, d.y, cy * d.z - sy * d.x);',
    '  vec2 uv = vec2(atan(d.x, d.z) / (2.0 * PI) + 0.5, asin(d.y) / PI + 0.5);',
    '  gl_FragColor = texture2D(sky, uv);',
    '}'
  ].join('\n');

  function shader(gl, type, source) {
    var id = gl.createShader(type);
    gl.shaderSource(id, source);
    gl.compileShader(id);
    return id;
  }

  function startPano(figure, picture) {
    var canvas = document.createElement('canvas');
    var gl = canvas.getContext('webgl');
    if (!gl || gl.getParameter(gl.MAX_TEXTURE_SIZE) < picture.naturalWidth) return;

    var program = gl.createProgram();
    gl.attachShader(program, shader(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, shader(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var position = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, picture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    var uniforms = {
      size: gl.getUniformLocation(program, 'size'),
      yaw: gl.getUniformLocation(program, 'yaw'),
      pitch: gl.getUniformLocation(program, 'pitch'),
      zoom: gl.getUniformLocation(program, 'zoom')
    };

    var yaw = -0.3;
    var pitch = 0.08;
    var dragging = false;
    var lastX = 0;
    var lastY = 0;
    var visible = false;
    var frame = 0;

    function clampPitch(value) { return Math.max(-0.6, Math.min(0.75, value)); }

    function resize() {
      var ratio = Math.min(window.devicePixelRatio || 1, 2);
      var width = Math.round(canvas.clientWidth * ratio);
      var height = Math.round(canvas.clientHeight * ratio);
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      gl.uniform2f(uniforms.size, width, height);
      // Wide windows keep a 90 degree view; narrow ones keep their height from zooming in too far.
      gl.uniform1f(uniforms.zoom, Math.min(0.55, 1 / (width / height)));
    }

    function draw() {
      resize();
      gl.uniform1f(uniforms.yaw, yaw);
      gl.uniform1f(uniforms.pitch, pitch);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function tick() {
      frame = 0;
      if (!visible) return;
      if (!dragging && !calm) yaw += 0.0007;
      draw();
      frame = window.requestAnimationFrame(tick);
    }

    function wake() {
      if (!frame) frame = window.requestAnimationFrame(tick);
    }

    canvas.tabIndex = 0;
    canvas.className = 'pano-view';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'A 360 degree view from the plaza of the Great Nest. Use the arrow keys to look around.');

    canvas.addEventListener('pointerdown', function (event) {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', function (event) {
      if (!dragging) return;
      var speed = 2.2 / canvas.clientHeight;
      yaw -= (event.clientX - lastX) * speed;
      pitch = clampPitch(pitch + (event.clientY - lastY) * speed);
      lastX = event.clientX;
      lastY = event.clientY;
      draw();
    });
    ['pointerup', 'pointercancel'].forEach(function (name) {
      canvas.addEventListener(name, function () { dragging = false; });
    });
    canvas.addEventListener('keydown', function (event) {
      var turn = { ArrowLeft: [-0.12, 0], ArrowRight: [0.12, 0], ArrowUp: [0, 0.08], ArrowDown: [0, -0.08] }[event.key];
      if (!turn) return;
      event.preventDefault();
      yaw += turn[0];
      pitch = clampPitch(pitch + turn[1]);
      draw();
    });

    figure.insertBefore(canvas, figure.firstChild);
    figure.classList.add('is-live');
    draw();
    window.addEventListener('resize', draw);
    whileVisible(figure, '0px', function (isVisible) {
      visible = isVisible;
      if (visible) wake();
    });
  }

  function loadPano() {
    var figure = document.querySelector('[data-pano]');
    if (!figure || !window.WebGLRenderingContext) return;
    var loaded = false;
    whileVisible(figure, '400px', function (near) {
      if (!near || loaded) return;
      loaded = true;
      var picture = new Image();
      picture.onload = function () { startPano(figure, picture); };
      picture.src = 'assets/img/pano.webp';
    });
  }

  loadPano();
  if (document.readyState === 'complete') startHeroLoop();
  else window.addEventListener('load', startHeroLoop);
})();
