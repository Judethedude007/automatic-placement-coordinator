// Dynamic WebGL Background with dark mode
document.addEventListener('DOMContentLoaded', function() {
    console.clear();
    const canvas = document.createElement('canvas');
    document.body.prepend(canvas); // Add at the beginning of the body
    canvas.style.display = 'block';
    canvas.style.position = 'fixed'; // Fixed position so it stays in the background
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '-1'; // Put it behind other content

    // Handle canvas resize
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (gl) {
            gl.viewport(0, 0, canvas.width, canvas.height);
            drawScene(); // Redraw when resized
        }
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const gl = canvas.getContext('webgl2');
    if (!gl) {
        console.log('WebGL 2 not supported, falling back to normal background');
        canvas.remove();
        return;
    }

    // Enhanced vertex shader
    const vss = `#version 300 es
    in vec2 p;
    void main() {
      gl_Position = vec4(p, 0.0, 1.0);
    }
    `;

    // Enhanced fragment shader with time uniform for animation
    const fss = `#version 300 es
    precision mediump float;
    out vec4 o;
    uniform vec4 c;
    uniform float time;
    
    void main() {
      // Darker colors for dark mode
      vec4 darkColor = vec4(0.05, 0.05, 0.15, c.a + 0.01 * sin(time * 0.001));
      o = darkColor;
    }
    `;

    // Create shader program
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vss);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(vs));
        return;
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fss);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(fs));
        return;
    }

    const prg = gl.createProgram();
    gl.attachShader(prg, vs);
    gl.attachShader(prg, fs);
    gl.linkProgram(prg);
    if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(prg));
        return;
    }

    gl.detachShader(prg, vs);
    gl.deleteShader(vs);
    gl.detachShader(prg, fs);
    gl.deleteShader(fs);

    const $p = gl.getAttribLocation(prg, 'p');
    const $c = gl.getUniformLocation(prg, 'c');
    const $time = gl.getUniformLocation(prg, 'time');

    const va = gl.createVertexArray();
    gl.bindVertexArray(va);

    const N = 300; // n triangles

    let ps;
    {    
        ps = new Float32Array(2 + N * 2 * 2);
        ps[0] = 0; // clip space center
        ps[1] = 0;
        let j = 2;
        for (let i = 0; i < N; ++i) {
            ps[j++] = Math.random() * 2 - 1; //x 
            ps[j++] = Math.random() * 2 - 1; //y
            ps[j++] = Math.random() * 2 - 1; //x 
            ps[j++] = Math.random() * 2 - 1; //y
        }
    }

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, ps, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray($p);
    gl.vertexAttribPointer(
        $p,
        2, gl.FLOAT, // two 32b-float (8bytes)
        false,
        0, // skip n byte to fetch next
        0  // skip n byte to fetch first
    );

    let idxs; 
    { 
        idxs = new Uint16Array(3 * N);
        let j = 0;
        for (let i = 0; i < N; ++i) {
            idxs[j++] = 0;
            idxs[j++] = 1 + i * 2;
            idxs[j++] = 2 + i * 2;
        }
    }

    const ibuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idxs, gl.STATIC_DRAW);

    gl.bindVertexArray(null);

    //----- render

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.05, 0.05, 0.1, 1); // Darker background for dark mode
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    gl.disable(gl.CULL_FACE);
    gl.useProgram(prg);
    gl.bindVertexArray(va);

    let startTime = Date.now();
    
    function drawScene() {
        const currentTime = Date.now() - startTime;
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform4fv($c, [0.1, 0.1, 0.2, 0.03]);
        gl.uniform1f($time, currentTime);
        gl.drawElements(
            gl.TRIANGLES,
            idxs.length, // n indices
            gl.UNSIGNED_SHORT, // ui16
            0 // skip n bytes to fetch first
        );
    }
    
    function animate() {
        drawScene();
        requestAnimationFrame(animate);
    }
    
    animate();

    // Mouse interaction
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    document.addEventListener('mousemove', (e) => {
        ps[0] = e.clientX / window.innerWidth * 2 - 1;
        ps[1] = -1 * (e.clientY / window.innerHeight * 2 - 1);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, ps.slice(0, 2));
    });
});
