'use strict';

let gl;
let surface;
let sh_program;
let spaceball;

let n_alpha = 20;
let n_beta = 36;
let light_angle = 0;
let anim_id = null;

function ShaderProgram(name, program) {
    this.name = name;
    this.prog = program;

    this.i_attrib_vertex = -1;
    this.i_attrib_normal = -1;
    this.i_attrib_tangent = -1;
    this.i_attrib_texcoord = -1;

    this.i_mvp_matrix = -1;
    this.i_mv_matrix = -1;
    this.i_normal_matrix = -1;
    this.i_light_pos = -1;
    this.i_tex_diffuse = -1;
    this.i_tex_specular = -1;
    this.i_tex_normal = -1;

    this.use = function() {
        gl.useProgram(this.prog);
    };
}

function mat4_to_mat3_normal(mv) {
    const a00 = mv[0], a01 = mv[1], a02 = mv[2];
    const a10 = mv[4], a11 = mv[5], a12 = mv[6];
    const a20 = mv[8], a21 = mv[9], a22 = mv[10];

    const det = a00 * (a11 * a22 - a12 * a21) -
                a01 * (a10 * a22 - a12 * a20) +
                a02 * (a10 * a21 - a11 * a20);

    const inv_det = 1.0 / det;

    return new Float32Array([
        (a11 * a22 - a21 * a12) * inv_det,
        (a20 * a12 - a10 * a22) * inv_det,
        (a10 * a21 - a20 * a11) * inv_det,
        (a21 * a02 - a01 * a22) * inv_det,
        (a00 * a22 - a20 * a02) * inv_det,
        (a20 * a01 - a00 * a21) * inv_det,
        (a01 * a12 - a11 * a02) * inv_det,
        (a10 * a02 - a00 * a12) * inv_det,
        (a00 * a11 - a10 * a01) * inv_det
    ]);
}

function transform_light(light_pos, mv) {
    const x = light_pos[0], y = light_pos[1], z = light_pos[2];
    return [
        mv[0] * x + mv[4] * y + mv[8] * z + mv[12],
        mv[1] * x + mv[5] * y + mv[9] * z + mv[13],
        mv[2] * x + mv[6] * y + mv[10] * z + mv[14]
    ];
}

function draw() {
    gl.clearColor(0.04, 0.06, 0.1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const projection = m4.perspective(Math.PI / 8, 1, 8, 12);
    const model_view = spaceball.getViewMatrix();

    const rotate_init = m4.axisRotation([1, 0, 0], 0.5);
    const translate_back = m4.translation(0, 0, -10);

    let mv = m4.multiply(rotate_init, model_view);
    mv = m4.multiply(translate_back, mv);

    const mvp = m4.multiply(projection, mv);
    const normal_mat = mat4_to_mat3_normal(mv);

    const light_eye = transform_light([3.5 * Math.cos(light_angle), 3.5 * Math.sin(light_angle), 0.5], mv);

    gl.uniformMatrix4fv(sh_program.i_mvp_matrix, false, mvp);
    gl.uniformMatrix4fv(sh_program.i_mv_matrix, false, mv);
    gl.uniformMatrix3fv(sh_program.i_normal_matrix, false, normal_mat);
    gl.uniform3fv(sh_program.i_light_pos, light_eye);

    gl.uniform1i(sh_program.i_tex_diffuse, 0);
    gl.uniform1i(sh_program.i_tex_specular, 1);
    gl.uniform1i(sh_program.i_tex_normal, 2);

    surface.draw();
}

function animate() {
    light_angle += 0.018;
    draw();
    anim_id = requestAnimationFrame(animate);
}

function rebuild_surface() {
    const data = create_surface_data(n_alpha, n_beta);
    surface.buffer_data(data.vertices, data.indices);
    if (spaceball) {
        draw();
    }
}

function on_slider_u(val) {
    n_alpha = parseInt(val);
    document.getElementById('val_u').textContent = val;
    rebuild_surface();
}

function on_slider_v(val) {
    n_beta = parseInt(val);
    document.getElementById('val_v').textContent = val;
    rebuild_surface();
}

function init_gl() {
    const prog = create_program(gl, vertexShaderSource, fragmentShaderSource);

    sh_program = new ShaderProgram('NormalMap', prog);
    sh_program.use();

    sh_program.i_attrib_vertex = gl.getAttribLocation(prog, 'a_vertex');
    sh_program.i_attrib_normal = gl.getAttribLocation(prog, 'a_normal');
    sh_program.i_attrib_tangent = gl.getAttribLocation(prog, 'a_tangent');
    sh_program.i_attrib_texcoord = gl.getAttribLocation(prog, 'a_texcoord');
    sh_program.i_mvp_matrix = gl.getUniformLocation(prog, 'u_mvp_matrix');
    sh_program.i_mv_matrix = gl.getUniformLocation(prog, 'u_mv_matrix');
    sh_program.i_normal_matrix = gl.getUniformLocation(prog, 'u_normal_matrix');
    sh_program.i_light_pos = gl.getUniformLocation(prog, 'u_light_pos');
    sh_program.i_tex_diffuse = gl.getUniformLocation(prog, 'u_tex_diffuse');
    sh_program.i_tex_specular = gl.getUniformLocation(prog, 'u_tex_specular');
    sh_program.i_tex_normal = gl.getUniformLocation(prog, 'u_tex_normal');

    surface = new Model('Surface');
    rebuild_surface();

    surface.tex_diffuse = load_texture('textures/diffuse.jpg', draw);
    surface.tex_specular = load_texture('textures/specular.jpg', draw);
    surface.tex_normal = load_texture('textures/normal.jpg', draw);

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
    animate();
}
