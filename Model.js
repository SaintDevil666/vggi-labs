'use strict';

const R1 = 0.5;
const R2 = 1.5;
const B = 1.0;

function calc_radius(alpha) {
    const k = Math.PI / (2 * B);
    return (R2 - R1) / 2 * (1 - Math.cos(k * alpha)) + R1;
}

function surface_point(alpha, beta) {
    const r = calc_radius(alpha);
    return [r * Math.cos(beta), r * Math.sin(beta), alpha - B];
}

function create_u_polylines(n_alpha, n_beta) {
    const lines = [];
    const d_alpha = (2 * B) / n_alpha;
    const d_beta = (2 * Math.PI) / n_beta;

    for (let i = 0; i <= n_alpha; i++) {
        const alpha = i * d_alpha;
        const verts = [];
        for (let j = 0; j <= n_beta; j++) {
            const p = surface_point(alpha, j * d_beta);
            verts.push(p[0], p[1], p[2]);
        }
        lines.push(verts);
    }
    return lines;
}

function create_v_polylines(n_alpha, n_beta) {
    const lines = [];
    const d_alpha = (2 * B) / n_alpha;
    const d_beta = (2 * Math.PI) / n_beta;

    for (let j = 0; j <= n_beta; j++) {
        const beta = j * d_beta;
        const verts = [];
        for (let i = 0; i <= n_alpha; i++) {
            const p = surface_point(i * d_alpha, beta);
            verts.push(p[0], p[1], p[2]);
        }
        lines.push(verts);
    }
    return lines;
}

function Model(name) {
    this.name = name;
    this.vertex_buffer = gl.createBuffer();
    this.line_count = 0;
    this.pts_per_line = 0;

    this.buffer_data = function(lines) {
        this.line_count = lines.length;
        this.pts_per_line = lines[0].length / 3;

        let buf = [];
        for (const l of lines) buf = buf.concat(l);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(buf), gl.STATIC_DRAW);
    };

    this.draw = function() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);
        gl.vertexAttribPointer(sh_program.i_attrib_vertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(sh_program.i_attrib_vertex);

        for (let i = 0; i < this.line_count; i++) {
            gl.drawArrays(gl.LINE_STRIP, i * this.pts_per_line, this.pts_per_line);
        }
    };
}
