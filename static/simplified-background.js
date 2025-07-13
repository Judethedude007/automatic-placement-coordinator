// WebGL background with cursor implementation
document.addEventListener('DOMContentLoaded', function() {
    // Set up WebGL canvas
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    canvas.style.position = 'fixed';
    canvas.style.zIndex = '-1';
    canvas.style.top = '0';
    canvas.style.left = '0';
    
    const gl = canvas.getContext('webgl');
    if (!gl) {
        console.error('WebGL not supported');
        return;
    }

    // Resize canvas to fill the window
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    window.onresize = resize;
    resize();

    // Mouse tracking for both background and cursor
    const mouse = { x: 0.5, y: 0.5 };
    let mouseX = 0;
    let mouseY = 0;

    // Create custom cursor element
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

    // Shaders
    const vertexShader = `
    attribute vec2 position;
    void main() {
        gl_Position = vec4(position, 0.0, 1.0);
    }`;

    const fragmentShader = `
    precision mediump float;
    uniform float time;
    uniform vec2 resolution;
    uniform vec2 mouse;

    float map(vec3 p) {
        vec3 q = fract(p) * 2.0 - 1.0;
        return length(q) - 0.25;
    }

    void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        uv = uv * 2.0 - 1.0;
        uv.x *= resolution.x / resolution.y;
        
        // Camera
        vec3 ro = vec3(0.0, 0.0, time * 0.5);
        vec3 rd = normalize(vec3(uv, 1.0));
        
        // Rotation based on mouse
        float a = mouse.x * 3.14159 * 2.0;
        float c = cos(a);
        float s = sin(a);
        rd.xz = mat2(c, s, -s, c) * rd.xz;
        
        float t = 0.0;
        float d = 0.0;
        
        for(int i = 0; i < 40; i++) {
            vec3 p = ro + rd * t;
            d = map(p);
            t += d * 0.5;
        }
        
        vec3 color = vec3(0.0);
        color += 1.0 / (1.0 + t * t * 0.1);
        
        color *= vec3(0.2, 0.3, 0.4);
        
        gl_FragColor = vec4(color, 1.0);
    }`;

    // Compile shaders
    function compileShader(source, type) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        }
        return shader;
    }

    const program = gl.createProgram();
    gl.attachShader(program, compileShader(vertexShader, gl.VERTEX_SHADER));
    gl.attachShader(program, compileShader(fragmentShader, gl.FRAGMENT_SHADER));
    gl.linkProgram(program);
    gl.useProgram(program);

    // Create quad
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Set up attributes and uniforms
    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const timeLocation = gl.getUniformLocation(program, 'time');
    const resolutionLocation = gl.getUniformLocation(program, 'resolution');
    const mouseLocation = gl.getUniformLocation(program, 'mouse');

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

    // Render loop
    function render() {
        const time = performance.now() * 0.001;
        
        gl.uniform1f(timeLocation, time);
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        gl.uniform2f(mouseLocation, mouse.x, mouse.y);
        
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        
        updateCursor();
        requestAnimationFrame(render);
    }
    
    // Mouse interaction
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        mouse.x = e.clientX / canvas.width;
        mouse.y = 1.0 - e.clientY / canvas.height;
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
    
    // Handle touch events for mobile
    document.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            mouseX = e.touches[0].clientX;
            mouseY = e.touches[0].clientY;
            
            mouse.x = mouseX / canvas.width;
            mouse.y = 1.0 - mouseY / canvas.height;
        }
    });

    // Start rendering
    render();
});
