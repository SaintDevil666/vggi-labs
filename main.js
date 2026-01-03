'use strict';

let gl;
let u_lines;
let v_lines;
let sh_program;
let spaceball;

const N_ALPHA = 20;
const N_BETA = 36;

function ShaderProgram(name, program) {
    this.name = name;
    this.prog = program;
    this.i_attrib_vertex = -1;
    this.i_color = -1;
    this.i_mvp_matrix = -1;

    this.use = function() {
        gl.useProgram(this.prog);
    };
}

function draw() {
    gl.clearColor(0.05, 0.1, 0.15, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const projection = m4.perspective(Math.PI / 8, 1, 8, 12);
    const model_view = spaceball.getViewMatrix();

    const rotate_init = m4.axisRotation([1, 0, 0], 0.5);
    const translate_back = m4.translation(0, 0, -10);

    let mat = m4.multiply(rotate_init, model_view);
    mat = m4.multiply(translate_back, mat);

    const mvp = m4.multiply(projection, mat);
    gl.uniformMatrix4fv(sh_program.i_mvp_matrix, false, mvp);

    gl.uniform4fv(sh_program.i_color, [1, 0.6, 0.4, 1]);
    v_lines.draw();

    gl.uniform4fv(sh_program.i_color, [0.2, 0.8, 0.9, 1]);
    u_lines.draw();
}

function init_gl() {
    const prog = create_program(gl, vertexShaderSource, fragmentShaderSource);

    sh_program = new ShaderProgram('Basic', prog);
    sh_program.use();

    v_lines = new Model('V_Lines');
    v_lines.buffer_data(create_v_polylines(N_ALPHA, N_BETA));

    u_lines = new Model('U_Lines');
    u_lines.buffer_data(create_u_polylines(N_ALPHA, N_BETA));

    sh_program.i_attrib_vertex = gl.getAttribLocation(prog, 'a_vertex');
    sh_program.i_mvp_matrix = gl.getUniformLocation(prog, 'u_mvp_matrix');
    sh_program.i_color = gl.getUniformLocation(prog, 'u_color');

    gl.enable(gl.DEPTH_TEST);
}

function create_program(gl, v_src, f_src) {
    const vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, v_src);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error('Vertex shader: ' + gl.getShaderInfoLog(vsh));
    }

    const fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, f_src);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error('Fragment shader: ' + gl.getShaderInfoLog(fsh));
    }

    const prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error('Link: ' + gl.getProgramInfoLog(prog));
    }
    return prog;
}

function init() {
    let canvas;
    try {
        canvas = document.getElementById('webglcanvas');
        gl = canvas.getContext('webgl');
        if (!gl) {
            throw 'WebGL not supported';
        }
    } catch (e) {
        document.getElementById('canvas-holder').innerHTML =
            '<p>WebGL init failed.</p>';
        return;
    }

    try {
        init_gl();
    } catch (e) {
        document.getElementById('canvas-holder').innerHTML =
            '<p>GL init error: ' + e + '</p>';
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);
    draw();
}
