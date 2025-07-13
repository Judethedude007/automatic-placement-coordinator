// Simplified WebGL background
document.addEventListener('DOMContentLoaded', function() {
    console.clear();
    const canvas = document.createElement('canvas');
    document.body.append(canvas);
    canvas.style.display = 'block';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '-1';

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Create custom cursor elements
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    document.body.appendChild(cursor);
    
    // Create cursor trails
    const maxTrails = 8;
    const trails = [];
    for(let i = 0; i < maxTrails; i++) {
        const trail = document.createElement('div');
        trail.className = 'cursor-trail';
        document.body.appendChild(trail);
        trails.push({
            element: trail,
            x: 0,
            y: 0,
            age: i * 0.1
        });
    }
    
    // Create background cursor (behind all content)
    const backgroundCursor = document.createElement('div');
    backgroundCursor.className = 'background-cursor';
    document.body.appendChild(backgroundCursor);
    
    // Create pulsing background cursor effect
    const backgroundCursorPulse = document.createElement('div');
    backgroundCursorPulse.className = 'background-cursor-pulse';
    document.body.appendChild(backgroundCursorPulse);
    
    // Track mouse position for both WebGL and cursor
    let mouseX = 0;
    let mouseY = 0;

    const gl = canvas.getContext('webgl2');
    if (!gl) {
        alert('require webgl 2.0, bye');
        return;
    }

    const vss = `#version 300 es
    in vec2 p;
    void main() {
      gl_Position = vec4(p, 0.0, 1.0);
    }
    `;

    const fss = `#version 300 es
    precision mediump float;
    out vec4 o;
    uniform vec4 c;
    void main() {
      o = c;
    }
    `;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vss);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(vs));
        throw 1;
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fss);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(fs));
        throw 2;
    }

    const prg = gl.createProgram();
    gl.attachShader(prg, vs);
    gl.attachShader(prg, fs);
    gl.linkProgram(prg);
    if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(prg));
        throw 3;
    }

    gl.detachShader(prg, vs);
    gl.deleteShader(vs);
    gl.detachShader(prg, fs);
    gl.deleteShader(fs);

    const $p = gl.getAttribLocation(prg, 'p');
    const $c = gl.getUniformLocation(prg, 'c');

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

    //----- render setup
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.1, 0.1, 0.1, 1);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    gl.disable(gl.CULL_FACE);
    gl.useProgram(prg);
    gl.bindVertexArray(va);

    function drawScene() {
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform4fv($c, [0.25, 0.25, 0.3, 0.03]);
        gl.drawElements(
            gl.TRIANGLES,
            idxs.length, // n indices
            gl.UNSIGNED_SHORT, // ui16
            0 // skip n bytes to fetch first
        );
    }
    
    // Update cursor and trails with easing
    function updateCursor() {
        // Update main cursor
        cursor.style.left = `${mouseX}px`;
        cursor.style.top = `${mouseY}px`;
        
        // Update background cursor (with smoother easing for bigger element)
        backgroundCursor.style.left = `${mouseX}px`;
        backgroundCursor.style.top = `${mouseY}px`;
        
        // Update background cursor pulse (with even more delay)
        backgroundCursorPulse.style.left = `${mouseX}px`;
        backgroundCursorPulse.style.top = `${mouseY}px`;
        
        // Update trails with delay
        for(let i = 0; i < trails.length; i++) {
            const trail = trails[i];
            trail.age += 0.02;
            
            // Calculate trail positions with delay
            const delay = 0.1 * (i + 1);
            const trailX = mouseX - (mouseX - trail.x) * Math.exp(-delay);
            const trailY = mouseY - (mouseY - trail.y) * Math.exp(-delay);
            
            trail.x = trailX;
            trail.y = trailY;
            
            // Apply position
            trail.element.style.left = `${trailX}px`;
            trail.element.style.top = `${trailY}px`;
            
            // Fade out by age
            const opacity = Math.max(0, 0.5 - i * 0.05);
            trail.element.style.opacity = opacity;
        }
    }
    
    // Main animation loop
    function animate() {
        updateCursor();
        requestAnimationFrame(animate);
    }
    
    // Initial draw
    drawScene();
    animate();

    // Mouse interaction - update WebGL and cursor
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        ps[0] = e.clientX / window.innerWidth * 2 - 1;
        ps[1] = -1 * (e.clientY / window.innerHeight * 2 - 1);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, ps.slice(0, 2)); // that's why DYNAMIC_DRAW
        drawScene();
    });
    
    // Add hover effect to cursor when over interactive elements
    document.addEventListener('mouseover', (e) => {
        if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || 
            e.target.classList.contains('browse-label')) {
            cursor.classList.add('hover');
        }
    });
    
    document.addEventListener('mouseout', (e) => {
        if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || 
            e.target.classList.contains('browse-label')) {
            cursor.classList.remove('hover');
        }
    });
    
    // Hide cursor when leaving window
    document.addEventListener('mouseleave', () => {
        cursor.style.opacity = 0;
        trails.forEach(trail => {
            trail.element.style.opacity = 0;
        });
    });
    
    document.addEventListener('mouseenter', () => {
        cursor.style.opacity = 1;
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
        drawScene();
    });
    
    // Handle touch events for mobile
    document.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            mouseX = e.touches[0].clientX;
            mouseY = e.touches[0].clientY;
            
            ps[0] = mouseX / window.innerWidth * 2 - 1;
            ps[1] = -1 * (mouseY / window.innerHeight * 2 - 1);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, ps.slice(0, 2));
            drawScene();
        }
    });
});
